"""V1 isolated poller. Only explicit TEST mappings; no discovery/import/backfill."""
import argparse, base64, contextlib, datetime as dt, fcntl, json, os, re, sqlite3, sys
import urllib.request, urllib.error, urllib.parse, xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

class SyncError(Exception): pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): raise SyncError('Redirect refused')

def request(url, method='GET', data=None, headers=None):
    req=urllib.request.Request(url,method=method,data=data,headers=headers or {})
    try:
        with urllib.request.build_opener(NoRedirect).open(req,timeout=30) as r:
            return r.status,dict(r.headers),r.read()
    except urllib.error.HTTPError as e:
        return e.code,dict(e.headers),e.read()
    except Exception: raise SyncError('Connection failed; no deletion inferred') from None

def validate_url(url, simulated=False):
    u=urllib.parse.urlsplit(url)
    if u.username or u.password or u.query or u.fragment: raise SyncError('Invalid endpoint URL')
    if u.scheme!='https' and not (simulated and u.scheme=='http' and u.hostname in ['127.0.0.1','localhost']): raise SyncError('HTTPS required')
    return u

class CalDAV:
    def __init__(self, env):
        self.collection=env['APPLE_TEST_CALDAV_URL'].rstrip('/')+'/'
        validate_url(self.collection,env.get('APPLE_TEST_LOCAL_SIMULATION')=='true')
        self.headers={'Authorization':'Basic '+base64.b64encode((env['APPLE_TEST_CALDAV_USER']+':'+env['APPLE_TEST_CALDAV_PASSWORD']).encode()).decode()}
    def verify(self):
        body=b'<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>'
        code,_,data=request(self.collection,'PROPFIND',body,{**self.headers,'Depth':'0','Content-Type':'application/xml'})
        if code!=207: raise SyncError('Cannot verify TEST calendar')
        try:
            root=ET.fromstring(data)
            props=[p for p in root.findall('.//{DAV:}propstat') if ' 200 ' in p.findtext('{DAV:}status','')]
            if len(props)!=1 or props[0].findtext('.//{DAV:}displayname')!='NEACEA TEST — Gianluca' or props[0].find('.//{urn:ietf:params:xml:ns:caldav}calendar') is None: raise ValueError()
        except Exception: raise SyncError('Calendar is not the dedicated Gianluca TEST collection') from None
    def target(self, href):
        url=urllib.parse.urljoin(self.collection,href);u=urllib.parse.urlsplit(url);c=urllib.parse.urlsplit(self.collection)
        relative=urllib.parse.unquote(u.path[len(c.path):])
        if u.scheme!=c.scheme or u.netloc!=c.netloc or not u.path.startswith(c.path) or not relative or '/' in relative or relative in ['.','..'] or u.query or u.fragment: raise SyncError('Event outside TEST collection')
        return url
    def read(self,href):
        code,headers,data=request(self.target(href),headers=self.headers)
        if code==404:return None
        if code!=200:raise SyncError('CalDAV read failed; no deletion inferred')
        tag=headers.get('ETag') or headers.get('Etag')
        if not tag or tag.startswith('W/'):raise SyncError('Strong ETag required')
        return {'etag':tag,'ics':data.decode('utf-8')}
    def put(self,href,ics,etag):
        code,_,_=request(self.target(href),'PUT',ics.encode(),{**self.headers,'Content-Type':'text/calendar; charset=utf-8','If-Match':etag})
        if code not in [200,201,204]:raise SyncError('CalDAV conditional write refused')
    def delete(self,href,etag):
        code,_,_=request(self.target(href),'DELETE',headers={**self.headers,'If-Match':etag})
        if code not in [200,204]:raise SyncError('CalDAV conditional delete refused')

class Gateway:
    def __init__(self,env):
        self.url=env['APPLE_TEST_GATEWAY_URL'];u=validate_url(self.url,env.get('APPLE_TEST_LOCAL_SIMULATION')=='true')
        if u.hostname not in ['localhost','127.0.0.1'] and not (u.hostname=='neacea-test-gianluca.netlify.app' or u.hostname.endswith('--neacea-test-gianluca.netlify.app')):raise SyncError('Only isolated TEST gateway allowed')
        self.token=env['APPLE_TEST_ACCESS_TOKEN']
    def call(self,operation,id,**kwargs):
        code,_,data=request(self.url,'POST',json.dumps({'accessToken':self.token,'operation':operation,'id':id,**kwargs}).encode(),{'Content-Type':'application/json'})
        if code!=200:raise SyncError('NEACEA rejected operation (HTTP '+str(code)+')')
        return json.loads(data)
    def read(self,id):return self.call('read',id)
    def save(self,id,expected,patch):return self.call('save',id,expected=expected,patch=patch)

UTC=dt.timezone.utc
ROME=ZoneInfo('Europe/Rome')
def time_value(line):
    head,value=line.split(':',1)
    if 'VALUE=DATE' in head or not re.fullmatch(r'\d{8}T\d{6}Z?',value):raise SyncError('Timed event required')
    date=dt.datetime.strptime(value.rstrip('Z'),'%Y%m%dT%H%M%S')
    tz=re.search(r'(?:^|;)TZID=([^;]+)',head)
    zone=UTC if value.endswith('Z') else ZoneInfo(tz.group(1).strip('"')) if tz else ROME
    if date.replace(tzinfo=zone,fold=0).utcoffset()!=date.replace(tzinfo=zone,fold=1).utcoffset():raise SyncError('Ambiguous or missing daylight-saving time')
    return date.replace(tzinfo=zone).astimezone(ROME)
def parse(ics):
    lines=re.sub(r'\r?\n[ \t]','',ics).splitlines()
    if lines.count('BEGIN:VEVENT')!=1 or lines.count('END:VEVENT')!=1:raise SyncError('Exactly one VEVENT required')
    if any(re.match(r'^(RRULE|RDATE|EXDATE|RECURRENCE-ID)(?:[;:]|$)',l,re.I) for l in lines):raise SyncError('Recurrence forbidden')
    start,end=lines.index('BEGIN:VEVENT'),lines.index('END:VEVENT');props={}
    for line in lines[start+1:end]:
        if line.startswith(('BEGIN:','END:')):raise SyncError('Nested event components unsupported in TEST V1')
        key=line.split(':',1)[0].split(';',1)[0].upper()
        props.setdefault(key,[]).append(line)
    if len(props.get('UID',[]))!=1 or len(props.get('DTSTART',[]))!=1:raise SyncError('UID and DTSTART required')
    a=time_value(props['DTSTART'][0]);ends=props.get('DTEND',[]);duration=props.get('DURATION',[])
    if len(ends)+len(duration)!=1:raise SyncError('Exactly one end or duration required')
    if ends:b=time_value(ends[0])
    else:
        match=re.fullmatch(r'DURATION:PT(?:(\d+)H)?(?:(\d+)M)?',duration[0])
        if not match:raise SyncError('Unsupported duration')
        b=a+dt.timedelta(hours=int(match[1] or 0),minutes=int(match[2] or 0))
    minutes=(b.astimezone(UTC)-a.astimezone(UTC)).total_seconds()/60
    if not 0<minutes<=480 or minutes!=int(minutes) or a.second:raise SyncError('Invalid slot')
    return {'uid':props['UID'][0].split(':',1)[1], 'slot':{'date':a.strftime('%Y-%m-%d'),'start_time':a.strftime('%H:%M'),'duration_min':int(minutes)}}
def slot(row):return {k:(row[k][:5] if k=='start_time' else row[k]) for k in ['date','start_time','duration_min']}
def guarded(row):return {k:row.get(k) for k in ['client_ids','operator_id','service_id','status']}
def rewrite(ics,values):
    parse(ics)
    a=dt.datetime.fromisoformat(values['date']+'T'+values['start_time']).replace(tzinfo=ROME)
    if a.replace(fold=0).utcoffset()!=a.replace(fold=1).utcoffset():raise SyncError('Ambiguous or missing daylight-saving time')
    start=a.astimezone(UTC);end=start+dt.timedelta(minutes=values['duration_min'])
    out=[];inside=False
    for line in re.sub(r'\r?\n[ \t]','',ics).splitlines():
        if line=='BEGIN:VEVENT':inside=True
        if not inside:
            out.append(line);continue
        key=line.split(':',1)[0].split(';',1)[0].upper()
        if key=='DTSTART':out.extend(['DTSTART:'+start.strftime('%Y%m%dT%H%M%SZ'),'DTEND:'+end.strftime('%Y%m%dT%H%M%SZ')])
        elif key not in ['DTEND','DURATION','LAST-MODIFIED','DTSTAMP','SEQUENCE']:
            if line=='END:VEVENT':out.append('DTSTAMP:'+dt.datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ'))
            out.append(line)
        if line=='END:VEVENT':inside=False
    return '\r\n'.join(out)+'\r\n'

class Store:
    def __init__(self,path):
        self.path=path;self.db=sqlite3.connect(path)
        os.chmod(path,0o600)
        self.db.execute('CREATE TABLE IF NOT EXISTS mappings (appointment_id TEXT PRIMARY KEY, collection TEXT NOT NULL, href TEXT NOT NULL, uid TEXT NOT NULL, baseline TEXT NOT NULL, UNIQUE(collection,href), UNIQUE(collection,uid))');self.db.commit()
    def put(self,id,collection,href,uid,baseline):
        self.db.execute('INSERT INTO mappings VALUES(?,?,?,?,?) ON CONFLICT(appointment_id) DO UPDATE SET baseline=excluded.baseline',(id,collection,href,uid,json.dumps(baseline)));self.db.commit()
    def all(self):return self.db.execute('SELECT * FROM mappings ORDER BY appointment_id').fetchall()
    def close(self):self.db.close()
    @contextlib.contextmanager
    def lock(self):
        with open(self.path+'.lock','a') as f:
            os.chmod(self.path+'.lock',0o600);fcntl.flock(f,fcntl.LOCK_EX);yield

def baseline(n,a):return {'slot':slot(n),'guard':guarded(n),'apple':None if a is None else parse(a['ics'])['slot']}
def link(store,cal,gw,id,href):
    if not id.startswith('TEST_'):raise SyncError('Explicit TEST appointment required')
    cal.verify();n=gw.read(id);a=cal.read(href)
    if not a or n['status']!='prenotato':raise SyncError('Link requires existing booked TEST appointment and event')
    event=parse(a['ics'])
    if event['uid']!='neacea-test-'+id:raise SyncError('Explicit machine UID mismatch; never match by name')
    if event['slot']!=slot(n):raise SyncError('Align the explicit TEST pair before linking')
    if any(r[0]==id for r in store.all()):raise SyncError('Mapping already exists; baseline cannot be reset')
    store.put(id,cal.collection,href,event['uid'],baseline(n,a))
def sync(store,cal,gw):
    cal.verify();out=[]
    for id,collection,href,uid,encoded in store.all():
        if collection!=cal.collection:raise SyncError('Mapping belongs to a different collection')
        old=json.loads(encoded);n=gw.read(id);a=cal.read(href)
        if n['status'] not in ['prenotato','annullato']:raise SyncError('Fatto/No-show locked; no Apple mutation allowed')
        if any(guarded(n)[k]!=old['guard'][k] for k in ['client_ids','operator_id','service_id']):raise SyncError('Protected NEACEA fields changed')
        ap=None if a is None else parse(a['ics'])
        if ap and ap['uid']!=uid:raise SyncError('Linked UID changed')
        ns=slot(n);aps=ap['slot'] if ap else None
        nc=ns!=old['slot'] or n['status']!=old['guard']['status'];ac=aps!=old['apple']
        if nc and ac and not ((n['status']=='annullato' and a is None) or (n['status']=='prenotato' and ns==aps)):
            raise SyncError('Both sides changed; no overwrite performed')
        if nc and not ac:
            if n['status']=='annullato':
                if a:cal.delete(href,a['etag']);a=None
            else:
                if not a:raise SyncError('Deleted Apple event cannot be recreated automatically')
                cal.put(href,rewrite(a['ics'],ns),a['etag']);a=cal.read(href)
                if not a or parse(a['ics'])['slot']!=ns:raise SyncError('Apple verification failed; retry without resetting baseline')
            out.append('NEACEA_TO_APPLE')
        elif ac and not nc:
            patch={'status':'annullato'} if a is None else aps
            n=gw.save(id,n,patch);out.append('APPLE_TO_NEACEA')
        else:out.append('UNCHANGED')
        # Crash after a side commits is recovered when both sides converge on the next run.
        store.put(id,collection,href,uid,baseline(n,a))
    return out

def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['link','once']);parser.add_argument('--appointment');parser.add_argument('--href');args=parser.parse_args()
    env=os.environ
    required=['APPLE_TEST_CALDAV_URL','APPLE_TEST_CALDAV_USER','APPLE_TEST_CALDAV_PASSWORD','APPLE_TEST_GATEWAY_URL','APPLE_TEST_ACCESS_TOKEN','APPLE_TEST_MAPPING_DB']
    if any(not env.get(k) for k in required):raise SyncError('Missing TEST env configuration: '+', '.join(k for k in required if not env.get(k)))
    cal=CalDAV(env);gw=Gateway(env);store=Store(env['APPLE_TEST_MAPPING_DB'])
    try:
        with store.lock():
            if args.command=='link':
                if not args.appointment or not args.href:raise SyncError('Explicit appointment and href required')
                link(store,cal,gw,args.appointment,args.href);print('LINKED')
            else:print(json.dumps(sync(store,cal,gw)))
    finally:store.close()
if __name__=='__main__':
    try:main()
    except Exception as e:
        print('TEST SYNC STOPPED: '+(str(e) if isinstance(e,SyncError) else type(e).__name__),file=sys.stderr);sys.exit(1)
