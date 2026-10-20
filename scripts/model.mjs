// Deliberately constrained source adapter for this repository's modeling profile.
// Native SysML validation is a separate, optional build gate.
export function parseFile(text, file) {
  const clean = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, s=>s.replace(/[^\n]/g,' '));
  const result=[];
  for(const match of clean.matchAll(/\bpart\s+def\s+(\w+)(?:\s*:>\s*(\w+))?\s*([;{])/g)) {
    let end=match.index+match[0].length;
    if(match[3]==='{') {let depth=1;while(depth&&end<clean.length){depth+=(clean[end]==='{')-(clean[end]==='}');end++;}if(depth)throw Error('Unbalanced part definition');}
    const body=clean.slice(match.index+match[0].length,end-1);
    let depth=0;const direct=[...body].map(c=>{if(c==='{'){depth++;return ' ';}if(c==='}'){depth--;return ' ';}return depth?c==='\n'?'\n':' ':c;}).join('');
    const attributes={};for(const a of direct.matchAll(/\battribute\s+(?::>>\s*)?(\w+)(?:\s*:\s*\w+)?\s+(?:default\s+)?=\s*([^;]+);/g)){let value=a[2].trim();try{value=JSON.parse(value);}catch{}attributes[a[1]]=value;}
    const parts=[...direct.matchAll(/\bpart\s+(\w+)\s*:\s*(\w+)(?:\[([^\]]+)\])?/g)].map(m=>({name:m[1],type:m[2],multiplicity:m[3]||'1'}));
    const ports=[...direct.matchAll(/\bport\s+(\w+)\s*:\s*(~?)(\w+)/g)].map(m=>({name:m[1],conjugated:!!m[2],type:m[3]}));
    const connections=[...direct.matchAll(/\bconnect\s+(\w+)\.(\w+)\s+to\s+(\w+)\.(\w+)\s*;/g)].map(m=>({source:m[1],sourcePort:m[2],target:m[3],targetPort:m[4]}));
    const bindings=[...direct.matchAll(/\bbind\s+([\w.]+)\s*=\s*([\w.]+)\s*;/g)].map(m=>({source:m[1],target:m[2]}));
    const startLine=text.slice(0,match.index).split('\n').length,endLine=text.slice(0,end).split('\n').length;
    result.push({name:match[1],parent:match[2]||null,file,startLine,endLine,attributes,parts,ports,connections,bindings,source:text.split('\n').slice(startLine-1,endLine).join('\n')});
  }
  return result;
}
export function resolve(definitions,name,seen=new Set()) {
  if(seen.has(name))throw Error('Inheritance cycle: '+name);
  const own=definitions[name];if(!own)throw Error('Unknown definition: '+name);
  seen.add(name);const parent=own.parent?resolve(definitions,own.parent,seen):{attributes:{},parts:[],ports:[],connections:[],bindings:[]};
  const merge=(a,b)=>[...new Map([...a,...b].map(x=>[x.name,x])).values()];
  return {...own,attributes:{...parent.attributes,...own.attributes},parts:merge(parent.parts,own.parts),ports:merge(parent.ports,own.ports),connections:[...parent.connections,...own.connections],bindings:[...parent.bindings,...own.bindings]};
}
export function checkModel(definitions,name) {
  const root=resolve(definitions,name),a=root.attributes;
  if(a.modelWidth!==undefined){for(const key of ['blockCount','modelWidth','headCount','mlpWidth','vocabulary','contextLength'])if(!Number.isInteger(a[key])||a[key]<=0)throw Error('Invalid decoder dimension '+key);if(a.modelWidth%a.headCount||a.mlpWidth!==4*a.modelWidth)throw Error('Unsupported decoder dimensions');}
  for(const part of root.parts)resolve(definitions,part.type);
  for(const edge of root.connections){for(const [p,port] of [[edge.source,edge.sourcePort],[edge.target,edge.targetPort]]){const part=root.parts.find(n=>n.name===p);if(!part||!resolve(definitions,part.type).ports.some(x=>x.name===port))throw Error('Undeclared connection endpoint '+p+'.'+port);}}
  return root;
}
