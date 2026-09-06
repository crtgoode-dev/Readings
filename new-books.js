(async()=>{
  const galleryEl=document.getElementById('gallery');
  const filtersEl=document.getElementById('filters');
  const countEl=document.getElementById('count');
  const searchEl=document.getElementById('search');
  const bibEl=document.getElementById('bibliography');
  const bibList=document.getElementById('bib-list');
  const bibStatus=document.getElementById('bib-status');
  const galleryView=document.getElementById('gallery-view');
  const bibliographyView=document.getElementById('bibliography-view');
  const lightbox=document.getElementById('lightbox');
  const lightboxImage=document.getElementById('lightbox-image');
  const lightboxCaption=document.getElementById('lightbox-caption');

  function parseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}
      if(c==='"'){quoted=!quoted;continue}
      if(c===','&&!quoted){row.push(cell);cell='';continue}
      if((c==='\n'||c==='\r')&&!quoted){
        if(c==='\r'&&n==='\n')i++;
        row.push(cell);cell='';
        if(row.some(v=>v!==''))rows.push(row);
        row=[];continue;
      }
      cell+=c;
    }
    if(cell||row.length){row.push(cell);rows.push(row)}
    const headers=rows.shift()||[];
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
  }

  function prettyDate(iso,fallback){
    if(!iso)return fallback||'';
    const d=new Date(iso+'T12:00:00');
    return Number.isNaN(d.getTime())?(fallback||iso):d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  }

  let metadata=new Map();
  try{
    const csv=await fetch('books.csv',{cache:'no-store'});
    if(csv.ok){
      const records=parseCSV(await csv.text());
      metadata=new Map(records.filter(r=>r.image).map(r=>[r.image,r]));
    }
  }catch(e){console.warn('Bibliography unavailable:',e)}

  try{
    const owner=location.hostname.split('.')[0];
    const repo=(location.pathname.split('/').filter(Boolean)[0]||'Readings');
    const res=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=main`,{headers:{Accept:'application/vnd.github+json'}});
    if(res.ok){
      const files=await res.json();
      const known=new Set(books.map(b=>b[0]));
      const pattern=/^(\d{4})-(\d{2})-(\d{2})-(.+)\.(jpe?g|png|webp)$/i;
      for(const file of files){
        if(file.type!=='file'||known.has(file.name))continue;
        const m=file.name.match(pattern);if(!m)continue;
        const [,y,mo,d,slug]=m;
        const dateObj=new Date(`${y}-${mo}-${d}T12:00:00`);if(Number.isNaN(dateObj.getTime()))continue;
        const date=dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
        const title=slug.replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
        books.push([file.name,date,Number(y),title]);known.add(file.name);
      }
      books.sort((a,b)=>Date.parse(b[1])-Date.parse(a[1]));
    }
  }catch(e){console.warn('Automatic book discovery unavailable:',e)}

  const records=books.map((b,i)=>{
    const m=metadata.get(b[0])||{};
    return {
      index:i,image:b[0],date:prettyDate(m.date_read,b[1]),year:Number((m.date_read||'').slice(0,4))||b[2],
      author:m.author||'',title:m.title||b[3]||'',publisher:m.publisher||'',editionYear:m.edition_year||'',
      isbn13:m.isbn13||'',isbn10:m.isbn10||'',status:m.isbn_status||'',cataloged:Boolean(m.title||m.author)
    };
  });

  let selectedYear='all',query='',visibleRecords=[...records];
  function matches(r){
    if(selectedYear!=='all'&&String(r.year)!==selectedYear)return false;
    if(!query)return true;
    const hay=[r.author,r.title,r.publisher,r.isbn13,r.isbn10,r.date,r.year].join(' ').toLowerCase();
    return hay.includes(query);
  }
  function captionHTML(r){
    if(!r.cataloged)return `<span>${r.date}</span>`;
    const author=r.author?`<span class="book-author">${escapeHTML(r.author)}</span>`:'';
    return `<span class="book-title">${escapeHTML(r.title)}</span>${author}<span>${escapeHTML(r.date)}</span>`;
  }
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function fullCitation(r){
    const first=[r.author,r.title].filter(Boolean).join(' — ')||r.date;
    const pub=[r.publisher,r.editionYear].filter(Boolean).join(', ');
    const ids=[r.isbn13&&`ISBN-13 ${r.isbn13}`,r.isbn10&&`ISBN-10 ${r.isbn10}`].filter(Boolean).join(' · ');
    return [first,pub,ids,r.date].filter(Boolean).join(' · ');
  }
  function renderGallery(){
    visibleRecords=records.filter(matches);
    galleryEl.innerHTML='';
    for(const r of visibleRecords){
      const f=document.createElement('figure');f.className='book';f.dataset.year=r.year;
      const button=document.createElement('button');button.setAttribute('aria-label',r.title?`Open ${r.title}`:`Open book from ${r.date}`);
      const cover=document.createElement('img');cover.loading='lazy';cover.src=r.image;cover.alt=r.title?`${r.title} book cover`:`Book cover photographed ${r.date}`;
      const caption=document.createElement('figcaption');caption.innerHTML=captionHTML(r);
      button.appendChild(cover);button.onclick=()=>openRecord(r);f.append(button,caption);galleryEl.appendChild(f);
    }
    const cataloged=records.filter(r=>r.cataloged).length;
    countEl.textContent=`${records.length} books · ${cataloged} cataloged`;
    renderBibliography();
  }
  function renderBibliography(){
    const list=records.filter(r=>r.cataloged&&matches(r)).sort((a,b)=>(a.author||a.title).localeCompare(b.author||b.title));
    bibStatus.textContent=`${list.length} cataloged entries shown · ${records.filter(r=>r.cataloged).length} cataloged of ${records.length} total`;
    bibList.innerHTML=list.map(r=>{
      const pub=[r.publisher,r.editionYear].filter(Boolean).join(', ');
      const ids=[r.isbn13&&`ISBN-13 ${r.isbn13}`,r.isbn10&&`ISBN-10 ${r.isbn10}`].filter(Boolean).join(' · ');
      return `<article class="bib-entry"><strong>${escapeHTML(r.author||'Unknown author')}</strong>. <em>${escapeHTML(r.title)}</em>.<span class="meta">${escapeHTML([pub,ids,`Read ${r.date}`].filter(Boolean).join(' · '))}</span></article>`;
    }).join('');
  }
  function openRecord(r){
    current=records.indexOf(r);
    lightboxImage.src=r.image;lightboxImage.alt=r.title?`${r.title} book cover`:`Book cover photographed ${r.date}`;
    lightboxCaption.textContent=fullCitation(r);if(!lightbox.open)lightbox.showModal();
  }
  function moveRecord(d){
    const currentRecord=records[current];let p=visibleRecords.indexOf(currentRecord);if(p<0)p=0;
    openRecord(visibleRecords[(p+d+visibleRecords.length)%visibleRecords.length]);
  }

  filtersEl.innerHTML='';
  const years=[...new Set(records.map(r=>r.year))].filter(Boolean).sort((a,b)=>b-a);
  ['all',...years].forEach((y,i)=>{
    const b=document.createElement('button');b.textContent=y==='all'?'All':y;b.dataset.year=y;b.className=i?'':'active';
    b.onclick=()=>{selectedYear=String(y);[...filtersEl.children].forEach(x=>x.classList.toggle('active',x===b));renderGallery()};filtersEl.appendChild(b);
  });
  searchEl.oninput=()=>{query=searchEl.value.trim().toLowerCase();renderGallery()};
  galleryView.onclick=()=>{galleryView.classList.add('active');bibliographyView.classList.remove('active');galleryEl.hidden=false;bibEl.hidden=true};
  bibliographyView.onclick=()=>{bibliographyView.classList.add('active');galleryView.classList.remove('active');galleryEl.hidden=true;bibEl.hidden=false;renderBibliography()};
  document.getElementById('prev').onclick=()=>moveRecord(-1);document.getElementById('next').onclick=()=>moveRecord(1);
  renderGallery();
})();