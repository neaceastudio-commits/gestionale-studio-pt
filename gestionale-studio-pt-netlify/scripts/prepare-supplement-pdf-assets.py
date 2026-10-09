import pathlib,json,urllib.request,concurrent.futures,hashlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
root=pathlib.Path(__file__).resolve().parents[1];out=root/'tmp/pdfs';assets=root/'app/portale-personal-trainer/integratori/assets'
out.mkdir(parents=True,exist_ok=True)
for family,file in [('Body','montserrat-latin.woff2'),('Display','space-grotesk-latin.woff2')]:
 for weight in [400,700]:
  f=TTFont(assets/file)
  if 'fvar' in f:f=instantiateVariableFont(f,{'wght':weight},inplace=True)
  f.flavor=None
  for n in f['name'].names:
   if n.nameID in [1,2,3,4,6]:n.string=(f'{family}{weight}' if n.nameID!=2 else ('Bold' if weight==700 else 'Regular')).encode(n.getEncoding())
  f.save(out/f'{family}-{weight}.ttf')
manifest=json.load(open(root/'docs/supplements-editorial.json'))
urls=list(dict.fromkeys((v.get('image_url') or p['image_url']) for p in manifest for v in p['variants']))
def get(url):
 name=hashlib.sha256(url.encode()).hexdigest()[:12];path=out/(name+'.image')
 if path.exists():return url,str(path)
 if 'powerbar.com' in url:path.write_bytes((assets/'powerbar-creatine.png').read_bytes());return url,str(path)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45) as r:path.write_bytes(r.read())
 return url,str(path)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:images=dict(ex.map(get,urls))
json.dump(images,open(out/'images.json','w'));print(len(images),'official product photos ready')
