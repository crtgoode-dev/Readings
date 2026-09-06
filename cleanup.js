(()=>{
  const removeQuotePost=()=>{
    document.querySelectorAll('#gallery figure.book').forEach(el=>{
      const img=el.querySelector('img');
      if(img && /(?:^|\/)202\.jpg(?:$|\?)/.test(img.getAttribute('src')||'')) el.remove();
    });
    document.querySelectorAll('#bibliography .bib-entry').forEach(el=>{
      if(/Zara Witkin|An American Engineer in Stalin's Russia/i.test(el.textContent||'')) el.remove();
    });
  };
  const observer=new MutationObserver(removeQuotePost);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',removeQuotePost);
  removeQuotePost();
})();
