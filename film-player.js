// Feed the high-quality master in small media fragments, retaining native controls.
(async function () {
  const video=document.getElementById('film');
  if(!video||!window.MediaSource) return;
  let url,failed=false,playing=false;
  const fallback=()=>{if(failed)return;failed=true;const at=video.currentTime||0;const resume=playing||!video.paused;video.src='kolkata-evolution.mp4';video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(at,video.duration||0);if(resume)video.play().catch(()=>{});},{once:true});if(url)URL.revokeObjectURL(url);};
  try {
    const response=await fetch('film-hd/manifest.json');if(!response.ok)return;
    const manifest=await response.json();if(!MediaSource.isTypeSupported(manifest.mime))return;
    const media=new MediaSource();url=URL.createObjectURL(media);video.src=url;
    await new Promise((resolve,reject)=>{media.addEventListener('sourceopen',resolve,{once:true});media.addEventListener('error',reject,{once:true});});
    const buffer=media.addSourceBuffer(manifest.mime);let next=0,busy=false,full=false;
    const append=async(path)=>{const response=await fetch(path);if(!response.ok)throw Error('Video unavailable');const bytes=await response.arrayBuffer();await new Promise((resolve,reject)=>{const done=()=>{buffer.removeEventListener('error',bad);resolve();};const bad=()=>{buffer.removeEventListener('updateend',done);reject(Error('Video decode error'));};buffer.addEventListener('updateend',done,{once:true});buffer.addEventListener('error',bad,{once:true});try{buffer.appendBuffer(bytes);}catch(e){buffer.removeEventListener('updateend',done);buffer.removeEventListener('error',bad);reject(e);}});};
    const pump=async()=>{if(busy||failed)return;busy=true;try{while(next<manifest.segments.length&&(full||next<2)){await append(manifest.segments[next++]);}if(next===manifest.segments.length&&media.readyState==='open')media.endOfStream();}catch(e){fallback();}finally{busy=false;}};
    video.addEventListener('play',()=>{playing=true;full=true;pump();});
    video.addEventListener('seeking',()=>{full=true;pump();});
    video.addEventListener('error',fallback,{once:true});
    await append(manifest.init);media.duration=manifest.duration;await pump();
    if(!video.paused){full=true;pump();}
  }catch(e){if(url)fallback();}
})();
