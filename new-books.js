(async()=>{
  try{
    const owner=location.hostname.split('.')[0];
    const repo=(location.pathname.split('/').filter(Boolean)[0]||'Readings');
    const res=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=main`,{headers:{Accept:'application/vnd.github+json'}});
    if(!res.ok)return;
    const files=await res.json();
    const known=new Set(books.map(b=>b[0]));
    const pattern=/^(\d{4})-(\d{2})-(\d{2})-(.+)\.(jpe?g|png|webp)$/i;
    let added=0;
    for(const file of files){
      if(file.type!=='file'||known.has(file.name))continue;
      const m=file.name.match(pattern);
      if(!m)continue;
      const [,y,mo,d,slug]=m;
      const dateObj=new Date(`${y}-${mo}-${d}T12:00:00`);
      if(Number.isNaN(dateObj.getTime()))continue;
      const date=dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      const title=slug.replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
      books.push([file.name,date,Number(y),title]);
      known.add(file.name);
      added++;
    }
    if(!added)return;

    books.sort((a,b)=>Date.parse(b[1])-Date.parse(a[1]));
    visible=[...books.keys()];
    count.textContent=`${books.length} books · 2018–${Math.max(...books.map(b=>b[2]))}`;

    filters.innerHTML='';
    const yearList=[...new Set(books.map(b=>b[2]))];
    ['all',...yearList].forEach((y,i)=>{
      const button=document.createElement('button');
      button.textContent=y==='all'?'All':y;
      button.dataset.year=y;
      button.className=i?'':'active';
      button.onclick=()=>apply(String(y),button);
      filters.appendChild(button);
    });

    openBook=function(i){
      current=i;
      const b=books[i];
      img.src=b[0];
      img.alt=b[3]?`${b[3]} book cover`:`Book cover photographed ${b[1]}`;
      cap.textContent=b[3]?`${b[3]} · ${b[1]}`:b[1];
      if(!dialog.open)dialog.showModal();
    };

    gallery.innerHTML='';
    books.forEach((b,i)=>{
      const f=document.createElement('figure');
      f.className='book';
      f.dataset.year=b[2];
      const button=document.createElement('button');
      button.setAttribute('aria-label',b[3]?`Open ${b[3]}`:`Open book from ${b[1]}`);
      const cover=document.createElement('img');
      cover.loading='lazy';
      cover.src=b[0];
      cover.alt=b[3]?`${b[3]} book cover`:`Book cover photographed ${b[1]}`;
      const caption=document.createElement('figcaption');
      caption.textContent=b[3]?`${b[3]} · ${b[1]}`:b[1];
      button.appendChild(cover);
      button.onclick=()=>openBook(i);
      f.append(button,caption);
      gallery.appendChild(f);
    });
  }catch(e){
    console.warn('Automatic book discovery unavailable:',e);
  }
})();
