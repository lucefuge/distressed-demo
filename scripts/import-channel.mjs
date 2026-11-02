import fs from 'node:fs/promises'
const decode=s=>s.replace(/<br\s*\/?\s*>/g,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim()
let html=await fs.readFile('channel.html','utf8');let all=[]
for(let page=0;page<4;page++){
 for(const part of html.split('data-post="').slice(1)){
 const post=part.split('"')[0],id=post.split('/')[1];if(all.some(p=>p.post===post))continue
 const start=part.indexOf('class="tgme_widget_message_text js-message_text"');if(start<0)continue;const section=part.slice(start)
 const content=decode(section.slice(section.indexOf('>')+1).split('Связь, консультация:')[0])
 const lines=content.split('\n').map(s=>s.trim()).filter(Boolean),title=lines[0]
 const price=Number(content.match(/Новая цена\s*[—–-]\s*(\d+)/)?.[1]);if(!price||!title)continue
 const images=[...part.matchAll(/background-image:url\('(https:\/\/cdn[^']+)'\)/g)].map(m=>m[1]);if(!images.length)continue
 all.push({post,id,title,content,lines,price,images,date:part.match(/datetime="([^"]+)/)?.[1]})
 }
 if(all.length>=15)break
 const before=html.match(/data-before="(\d+)"/)?.[1];if(!before)break
 html=await(await fetch(`https://t.me/s/fuckdistressed?before=${before}`)).text()
 await fs.writeFile(`channel-${before}.html`,html)
}
all.sort((a,b)=>Number(b.id)-Number(a.id));all=all.slice(0,15)
await fs.mkdir('public/products',{recursive:true})
const result=[]
for(const p of all){
 const local=[];for(let i=0;i<p.images.length;i++){let r=await fetch(p.images[i]);for(let retry=0;!r.ok&&retry<3;retry++)r=await fetch(p.images[i]);if(!r.ok)throw Error(`Photo ${p.id}: ${r.status}`);const file=`products/${p.id}-${i}.jpg`;await fs.writeFile(`public/${file}`,Buffer.from(await r.arrayBuffer()));local.push('/'+file)}
 const sizeLine=p.lines.find(s=>/Размер|^-\s*[SMLX]+\b|^-\s*\d/.test(s))||''
 const sizes=sizeLine.includes('Размер')?sizeLine.replace(/^-\s*Размеры?\s*:?\s*/,'').split(/,\s*/):p.lines.filter(s=>/^-\s*[SMLXМ]+\b/.test(s)).map(s=>s.replace(/^-\s*/,''))
 const brand=['Balenciaga','Nike','Stone Island','C.P. Company','Adidas','adidas','Moncler','The North Face'].find(b=>p.title.includes(b))||'Не указан'
 const category=/Кепка|Cap/i.test(p.title)?'Кепки':/Перчатки/i.test(p.title)?'Перчатки':/Пуховик|Куртка/i.test(p.title)?'Куртки':/Шапка/i.test(p.title)?'Шапки':/Свитшот/i.test(p.title)?'Свитшоты':/Худи|Толстовка/i.test(p.title)?'Худи':'Другое'
 result.push({id:`TG-${p.id}`,name:p.title,brand,category,price:p.price,sizes,available:null,image:local[0],images:local,color:'',description:p.lines.filter(s=>s.startsWith('-')).join('\n'),sku:p.content.match(/Артикул:\s*([^\n]+)/)?.[1]||null,source:`https://t.me/${p.post}`,publishedAt:p.date})
}
await fs.writeFile('src/products.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.map(({id,name,price,sizes,description})=>({id,name,price,sizes,description})),null,2))
