// Screen-space label placement: keep important labels and suppress collisions.
export function placeLabels(candidates,width,height,limit=18){
 const placed=[];
 for(const c of [...candidates].sort((a,b)=>b.priority-a.priority||a.depth-b.depth)){
  if(c.x<0||c.y<0||c.x+c.w>width||c.y+c.h>height)continue;
  if(placed.length>=limit&&c.priority<100)continue;
  if(placed.some(p=>c.x<p.x+p.w+6&&c.x+c.w+6>p.x&&c.y<p.y+p.h+5&&c.y+c.h+5>p.y))continue;
  placed.push(c);
 }
 return placed;
}
