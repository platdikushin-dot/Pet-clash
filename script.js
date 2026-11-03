const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const cards = {
 dog: [
  {name:"Бублик",emoji:"🐶",power:12,rarity:"ОБЫЧНАЯ"},
  {name:"Рекс",emoji:"🐕",power:18,rarity:"ОБЫЧНАЯ"},
  {name:"Шиба",emoji:"🦊",power:25,rarity:"РЕДКАЯ"},
  {name:"Грозный пёс",emoji:"🐺",power:40,rarity:"ЭПИЧЕСКАЯ"},
  {name:"Король стаи",emoji:"🦁",power:65,rarity:"ЛЕГЕНДАРНАЯ"}
 ],
 cat: [
  {name:"Пушок",emoji:"🐱",power:12,rarity:"ОБЫЧНАЯ"},
  {name:"Ночной кот",emoji:"🐈‍⬛",power:18,rarity:"ОБЫЧНАЯ"},
  {name:"Лисичка",emoji:"🦊",power:25,rarity:"РЕДКАЯ"},
  {name:"Теневой кот",emoji:"🐆",power:40,rarity:"ЭПИЧЕСКАЯ"},
  {name:"Королева ночи",emoji:"🐅",power:65,rarity:"ЛЕГЕНДАРНАЯ"}
 ]
};
const defaults = {coins:500,wins:0,collection:[],lastBattle:0};
let state = loadState();
function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem("petClashSave")||"{}")}}catch(e){return {...defaults}}}
function save(){localStorage.setItem("petClashSave",JSON.stringify(state));render()}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300)}
function chooseRace(race){state.race=race;if(!state.collection.length){state.collection.push({...cards[race][0],id:Date.now()})}save();showGame()}
function changeRace(){if(!confirm("Сменить расу? Твоя коллекция и монеты сохранятся."))return;state.race=null;document.getElementById("gameScreen").classList.add("hidden");document.getElementById("bottomNav").classList.add("hidden");document.getElementById("chooseScreen").classList.remove("hidden")}
function showGame(){document.getElementById("chooseScreen").classList.add("hidden");document.getElementById("gameScreen").classList.remove("hidden");document.getElementById("bottomNav").classList.remove("hidden");render()}
function render(){
 if(!state.race)return;
 const dog=state.race==="dog";
 document.getElementById("raceTitle").textContent=dog?"🐶 СОБАКИ":"🐱 КОШКИ";
 document.getElementById("raceDesc").textContent=dog?"Верность, сила и отвага. Вперёд, команда!":"Ловкость, хитрость и магия. Вперёд, команда!";
 document.getElementById("cardCount").textContent=state.collection.length;
 document.getElementById("wins").textContent=state.wins;
 document.getElementById("power").textContent=state.collection.reduce((a,c)=>a+c.power,0);
 document.getElementById("collectionCount").textContent=state.collection.length+" карт";
 const area=document.getElementById("collection");
 area.innerHTML=state.collection.length?"":'<div class="empty">Открой первый сундук, чтобы получить бойцов!</div>';
 state.collection.forEach(c=>{const el=document.createElement("div");el.className="pet-card";el.innerHTML=`<div class="emoji">${c.emoji}</div><b>${escapeHtml(c.name)}</b><small>⚔️ Сила: ${c.power}</small><br><span class="rarity">${c.rarity}</span>`;area.appendChild(el)});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function openChest(type){
 const cost=type==="common"?100:250;
 if(state.coins<cost){toast("Не хватает монет!");return}
 state.coins-=cost;
 const pool=cards[state.race]||cards.dog;
 const count=type==="common"?1:2;
 for(let i=0;i<count;i++){
  let roll=Math.random();
  let idx=roll>.96?4:roll>.82?3:roll>.55?2:Math.floor(Math.random()*2);
  const c=pool[idx];state.collection.push({...c,id:Date.now()+i+Math.random()});
 }
 save();toast("🎉 Сундук открыт! Новые бойцы добавлены в коллекцию.");
}
function battle(){
 const myPower=state.collection.reduce((a,c)=>a+c.power,0);
 if(!myPower){toast("Сначала собери бойцов!");return}
 const enemy=20+Math.floor(Math.random()*Math.max(25,myPower+10));
 if(myPower>=enemy){state.wins++;state.coins+=75;save();toast("🏆 Победа! +75 монет.");}
 else{state.coins+=20;save();toast("Хорошая попытка! +20 монет за участие.");}
}
function scrollToSection(id){if(id==="gameScreen"){window.scrollTo({top:0,behavior:"smooth"});return}const el=document.querySelector("."+id);el?.scrollIntoView({behavior:"smooth",block:"start"})}
function updateTimer(){
 const cycle=4*60*60*1000;const now=Date.now();const elapsed=state.lastBattle?((now-state.lastBattle)%cycle):0;const left=cycle-elapsed;
 const h=String(Math.floor(left/3600000)).padStart(2,"0"),m=String(Math.floor(left%3600000/60000)).padStart(2,"0"),s=String(Math.floor(left%60000/1000)).padStart(2,"0");
 document.getElementById("battleTimer").textContent=`${h}:${m}:${s}`;
}
setInterval(updateTimer,1000);updateTimer();
if(state.race)showGame();else render();
