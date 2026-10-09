#!/usr/bin/env python3
"""Render the shared supplement content export to A4 PDFs (no private prices)."""
import json, pathlib, re, unicodedata, hashlib, copy, io
from xml.sax.saxutils import escape
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from pypdf import PdfReader, PdfWriter
ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS=ROOT/'app/portale-personal-trainer/integratori/assets';TMP=ROOT/'tmp/pdfs';OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
PRODUCTS=json.loads((ROOT/'docs/supplements-editorial.json').read_text());IMAGES=json.loads((TMP/'images.json').read_text())
for family in ['Body','Display']:
 for weight in [400,700]:pdfmetrics.registerFont(TTFont(f'{family}{weight}',str(TMP/f'{family}-{weight}.ttf')))
GREEN=HexColor('#033d27');INK=HexColor('#20312a');MUTED=HexColor('#52625a');BLUE=HexColor('#163f73');CREAM=HexColor('#f3f3ec');W=595.2756;H=841.8898
def embedded_image(path,limit=1000):
 img=Image.open(path);img.thumbnail((limit,limit),Image.Resampling.LANCZOS)
 if img.mode in ('RGBA','LA'):
  bg=Image.new('RGB',img.size,'white');bg.paste(img,mask=img.getchannel('A'));img=bg
 else:img=img.convert('RGB')
 stream=io.BytesIO();img.save(stream,format='JPEG',quality=90,optimize=True);stream.seek(0)
 return ImageReader(stream),img.size
background,_=embedded_image(ASSETS/'neacea-studio.webp',1400)
logo=svg2rlg(str(ASSETS/'neacea-logotipo.svg'))
def text(c,value,x,top,width,size=9.8,leading=13.2,color=INK,font='Body400'):
 value=escape(value).replace('\n','<br/>').replace('–','-').replace('—','-')
 p=Paragraph(value,ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=color,spaceAfter=0))
 _,height=p.wrap(width,1000);p.drawOn(c,x,top-height);return top-height

def block(c,title,body,x,y,w,color=GREEN):
 c.setFillColor(color);c.circle(x+6,y-7,5,fill=1,stroke=0)
 y=text(c,title.upper(),x+21,y,w-21,12,15,color,'Display700')-8
 y=text(c,body,x+21,y,w-21)
 return y-15

def slug(v):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',v).encode('ascii','ignore').decode().lower()).strip('-')
def signature(p,v):
 # Matches only the fields used in the brochure, so edited content cannot silently use an old PDF.
 payload={k:p.get(k,'') for k in ['name','brand','description','image_url']}
 payload.update(label=v['label'],format=v['format'],variant_image=v.get('image_url',''),content={**p['content'],**v.get('content',{})})
 return hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def render(p,v,path):
 c=canvas.Canvas(str(path),pagesize=(W,H));c.setTitle(f"NEACEA | {p['name']} | {v['label']}");c.setAuthor('NEACEA Studio')
 c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0)
 mark=copy.deepcopy(logo);scale=174/mark.width;mark.scale(scale,scale);renderPDF.draw(mark,c,30,790)
 text(c,'NUTRIZIONE & ALLENAMENTO\nCORPO & ANIMA',355,814,210,8.6,13,GREEN,'Display400')
 # Shared hero: original studio image plus a calm green field for legible typography.
 c.saveState();clip=c.beginPath();clip.rect(0,487,W,280);c.clipPath(clip,stroke=0,fill=0)
 c.drawImage(background,0,487,W,280,preserveAspectRatio=False,mask='auto')
 c.setFillColor(Color(.0118,.2392,.1529,alpha=.92));c.rect(0,487,W,280,fill=1,stroke=0);c.restoreState()
 c.setFillColor(white);c.roundRect(25,512,249,232,13,fill=1,stroke=0)
 url=v.get('image_url') or p['image_url'];img,(iw,ih)=embedded_image(IMAGES[url])
 scale=min(223/iw,206/ih)*(2.3 if p['name']=='Creatine Monohydrate' else 1)
 dw,dh=iw*scale,ih*scale;c.saveState();clip=c.beginPath();clip.roundRect(25,512,249,232,13);c.clipPath(clip,stroke=0,fill=0)
 c.drawImage(img,25+(249-dw)/2,512+(232-dh)/2,dw,dh,mask='auto');c.restoreState()
 y=text(c,p['brand'].upper(),300,737,266,9,12,white,'Display400')-18
 title=p['name'].replace('OMEGOR Vitality 500','OMEGOR\nVitality 500').replace('Crema di Arachidi Peanut Butter Iperproteico','Peanut Butter\nIperproteico').replace('Crema di Arachidi Peanut Butter','Peanut Butter\nSmooth').replace('Low Sugar Pancake Gluten Free','Low Sugar\nPancake').replace('Avena Farina Gluten Free','Avena Farina\nGluten Free').replace('Creatine Monohydrate','Creatine\nMonohydrate')
 y=text(c,title,300,y,266,27,29,white,'Display700')-12
 y=text(c,v['label']+'  |  '+v['format'],300,y,262,11,15,white,'Display400')-17
 y=text(c,p['description'],300,y,254,9.5 if p['brand']=='OMEGOR' else 10,13.5 if p['brand']=='OMEGOR' else 15,white)-15
 assert y>=550,(p['name'],v['label'],'hero overflow',y)
 for i,tag in enumerate(p['tag_labels'][:2]):
  x=300+i*133;c.setFillColor(HexColor('#dce9df') if not i else HexColor('#d7e4ed'));c.roundRect(x,509,124,28,14,fill=1,stroke=0);text(c,tag,x+10,528,108,8,11,GREEN,'Display700')
 if p.get('image_note'):text(c,'Foto di linea: confezione crema biscotto.',34,503,246,6.1,8,white)
 content={**p['content'],**v.get('content',{})}
 left=465;right=465
 left=block(c,'Cos’è',content.get('what',''),29,left,253)
 left=block(c,'Cosa fa',content.get('effects',''),29,left,253,BLUE)
 composition=content.get('nutrition','')+'\n'+content.get('ingredients','')
 left=block(c,'Cosa contiene',composition,29,left,253)
 right=block(c,'Come si utilizza',content.get('usage',''),308,right,258,BLUE)
 right=block(c,'Caratteristiche e allergeni',content.get('allergens',''),308,right,258)
 right=block(c,'Da sapere',content.get('warnings',''),308,right,258,HexColor('#76582e') if v.get('review_required') else GREEN)
 assert min(left,right)>68,(p['name'],v['label'],'body overflow',left,right)
 c.setStrokeColor(HexColor('#d9e1da'));c.line(30,66,W-30,66)
 source=v.get('source_url') or p['source_url'];text(c,'FONTE: '+p['source_name']+'  ·  SCHEDA '+p.get('sheet_date','09/2026'),30,55,365,6.8,10,MUTED,'Display400');c.linkURL(source,(30,42,355,60),relative=0)
 refs=p.get('effects_sources',[])
 if refs:
  text(c,'APPROFONDIMENTO: '+refs[0]['name'],30,41,365,6.6,9,MUTED)
  c.linkURL(refs[0]['url'],(30,31,390,43),relative=0)
 text(c,'Leggere sempre l’etichetta della confezione disponibile.',30,27,365,6.6,9,MUTED)
 text(c,'IL TUO PERCORSO,\nLA NOSTRA METODOLOGIA.',397,53,172,7.6,11,GREEN,'Display400')
 c.showPage();c.save()
manifest=[]
for p in PRODUCTS:
 for v in p['variants']:
  name=slug(p['name']+' '+v['label'])+'.pdf';path=OUT/name;render(p,v,path)
  manifest.append(dict(product_id=p['id'],variant_id=v['id'],file=name,title=p['name']+' · '+v['label'],review_required=v.get('review_required',False),image_note=p.get('image_note',''),signature=signature(p,v)))
writer=PdfWriter()
for row in manifest:writer.append(str(OUT/row['file']))
writer.add_metadata({'/Title':'NEACEA | Schede integratori','/Author':'NEACEA Studio'});writer.write(str(OUT/'neacea-catalogo-integratori.pdf'))
(TMP/'pdf-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for row in manifest:
 pdf=PdfReader(str(OUT/row['file']));assert len(pdf.pages)==1;assert 'NEACEA' in pdf.metadata.title;assert len(pdf.pages[0].extract_text())>400
print(f'Created {len(manifest)} A4 sheets and one combined catalog; all fit on one page.')
