#!/usr/bin/env python3
"""Printable NEACEA sale-price list; never includes acquisition costs or margins."""
import json, pathlib, os
from datetime import date
from decimal import Decimal
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=json.loads(pathlib.Path(os.environ.get('NEACEA_PRICE_LIST_DATA',ROOT/'docs/supplements-price-list.json')).read_text())
ROWS=DATA['rows']; OUT=pathlib.Path(os.environ.get('NEACEA_PRICE_LIST_OUT',ROOT/'output/pdf/neacea-listino-integratori.pdf'))
as_of=date.fromisoformat(DATA['as_of'])
months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
date_label=f'{as_of.day} {months[as_of.month-1]} {as_of.year}'
ASSETS=ROOT/'app/portale-personal-trainer/integratori/assets'
for family in ['Body','Display']:
 for weight in [400,700]:
  pdfmetrics.registerFont(TTFont(f'{family}{weight}',str(ROOT/f'tmp/pdfs/{family}-{weight}.ttf')))
GREEN=HexColor('#033d27'); INK=HexColor('#20312a'); MUTED=HexColor('#52625a')
PALE=HexColor('#edf3ee'); LINE=HexColor('#dbe3dd'); W,H=595.2756,841.8898

def find(name,label=None):
 result=[r for r in ROWS if r['name']==name and (label is None or r['label']==label)]
 assert result,(name,label)
 assert len({r['price_eur'] for r in result})==1,'Variants have different prices; split the printed row'
 assert len({r['format'] for r in result})==1,'Variants have different formats; split the printed row'
 return result

groups=[('PROTEINE E PERFORMANCE',[
 ('Hydro 90 BV 104','Wafer nocciola · Cioccolato fondente · Cioccolato',find('Hydro 90 BV 104')),
 ('Creatine Monohydrate','Powerbar Black Line · Neutro',find('Creatine Monohydrate')),
 ('PW1 Pre Workout con caffeina','WHYsport Professional · Agrumi',find('PW1 Pre Workout','Con caffeina · Agrumi')),
 ('PW1 Pre Workout senza caffeina','WHYsport Professional · Tè alla pesca',find('PW1 Pre Workout','Senza caffeina · Tè alla Pesca')),
 ('Cluster Dextrin Pure','WHYsport',find('Cluster Dextrin Pure')),
 ('Maltodestrine','WHYsport',find('Maltodestrine')),
 ('Gel Give Me Five','WHYsport · Lemon Cola',find('Gel Give Me Five')),
]),('INTEGRAZIONE QUOTIDIANA',[
 ('Collagene Rigenera','WHYnature · Vaniglia',find('Collagene Rigenera')),
 ('Magnesio Bisglicinato','WHYnature',find('Magnesio Bisglicinato')),
 ('Bromelina','WHYnature',find('Bromelina')),
 ('NAC 600 Plus','WHYnature',find('NAC 600 Plus')),
 ('OMEGOR Veg','Omega-3 da microalghe',find('OMEGOR Veg')),
 ('OMEGOR Krill','Omega-3 da olio di krill',find('OMEGOR Krill')),
 ('OMEGOR Vitality 500','Omega-3 da olio di pesce',find('OMEGOR Vitality 500')),
]),('ALIMENTI E SPUNTINI',[
 ('Avena Farina Gluten Free','Vaniglia · Cocco cioccolato bianco',find('Avena Farina Gluten Free')),
 ('Low Sugar Pancake Gluten Free','WHYnature · Cookies',find('Low Sugar Pancake Gluten Free')),
 ('Perfect Cream','WHYsport · Pistacchio',find('Perfect Cream')),
 ('Crema di arachidi Peanut Butter','WHYnature · Smooth',find('Crema di Arachidi Peanut Butter')),
 ('Peanut Butter Iperproteico','WHYsport · Crunch',find('Crema di Arachidi Peanut Butter Iperproteico')),
])]

# Include newly received products instead of silently omitting them from a fixed list.
covered_ids={r['variant_id'] for _,items in groups for _,_,rs in items for r in rs}
remaining={}
for r in ROWS:
 if r['variant_id'] not in covered_ids:
  key=(r['name'],r['format'],str(Decimal(r['price_eur']).normalize()))
  remaining.setdefault(key,[]).append(r)
for (name,fmt,price),rs in remaining.items():
 detail=' · '.join(r['label'] for r in rs if r['label']!='Standard') or rs[0]['brand']
 index=2 if name=='Wafer Zero' else 1
 groups[index][1].append((name,detail,rs))
covered=[r['variant_id'] for _,items in groups for _,_,rs in items for r in rs]
assert len(covered)==len(ROWS) and len(set(covered))==len(ROWS)
assert set(covered)=={r['variant_id'] for r in ROWS}
def price_label(value):
 amount=Decimal(value).quantize(Decimal('0.01'))
 return (str(int(amount)) if amount==amount.to_integral_value() else f'{amount:.2f}'.replace('.',','))+' €'
OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('NEACEA | Listino integratori');c.setAuthor('NEACEA Studio')
c.setSubject('Prezzi finali di vendita IVA inclusa - '+date_label)
def label(s,x,y,size=10,font='Body400',color=INK,align='left'):
 c.setFillColor(color);c.setFont(font,size)
 (c.drawRightString if align=='right' else c.drawString)(x,y,s)

logo=svg2rlg(str(ASSETS/'neacea-logotipo.svg'));scale=176/logo.width;logo.scale(scale,scale)
renderPDF.draw(logo,c,36,788)
label('NUTRIZIONE & ALLENAMENTO',W-36,810,8,'Display400',GREEN,'right')
label('CORPO & ANIMA',W-36,796,8,'Display400',GREEN,'right')
label('Listino integratori',36,742,29,'Display700',GREEN)
label('BOZZA - PREZZI DA CONFERMARE' if DATA.get('review_pending') else 'Prezzi NEACEA',36,720,11,'Body400',MUTED)
label('IVA INCLUSA',W-36,720,9,'Display700',GREEN,'right')
c.setStrokeColor(GREEN);c.setLineWidth(1.2);c.line(36,701,W-36,701)
label('PRODOTTO / GUSTO',44,681,8,'Display700',MUTED)
label('FORMATO',454,681,8,'Display700',MUTED,'right')
label('PREZZO',W-44,681,8,'Display700',MUTED,'right')
y=666
for group,items in groups:
 c.setFillColor(PALE);c.roundRect(36,y-20,W-72,20,4,fill=1,stroke=0)
 label(group,44,y-13.6,8.4,'Display700',GREEN)
 y-=20
 for name,detail,rs in items:
  r=rs[0]; price=price_label(r['price_eur'])
  assert pdfmetrics.stringWidth(name,'Display700',10.4)<340,name
  assert pdfmetrics.stringWidth(detail,'Body400',7.6)<340,detail
  label(name,44,y-12,10.4,'Display700')
  label(detail,44,y-20,7.6,'Body400',MUTED)
  label(r['format'],454,y-17,10,'Body400',INK,'right')
  label(price,W-44,y-18,17,'Display700',GREEN,'right')
  c.setStrokeColor(LINE);c.setLineWidth(.35);c.line(44,y-23,W-44,y-23)
  y-=24
 y-=9
assert y>=68,('content overflow',y)
c.setStrokeColor(GREEN);c.setLineWidth(.7);c.line(36,61,W-36,61)
label('Prezzi per confezione · IVA inclusa',36,45,8,'Body400',MUTED)
label('Aggiornato al '+date_label,36,31,7.5,'Body400',MUTED)
label('IL TUO PERCORSO,',W-36,45,8,'Display400',GREEN,'right')
label('LA NOSTRA METODOLOGIA.',W-36,31,8,'Display400',GREEN,'right')
c.showPage();c.save()
pdf=PdfReader(OUT);assert len(pdf.pages)==1
assert abs(float(pdf.pages[0].mediabox.width)-W)<.01
text=pdf.pages[0].extract_text()
for _,items in groups:
 for name,detail,rs in items:
  assert name in text and detail in text
  assert price_label(rs[0]['price_eur']) in text
assert not any(word in text.lower() for word in ['costo','margine','acquisto','ddt'])
print(f'Created {OUT.name}: one A4 page, {sum(len(items) for _,items in groups)} rows, all {len(ROWS)} variants, VAT-inclusive sale prices.')
