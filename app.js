function showTab(id){
 document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
 document.getElementById(id).classList.add('active');
}
function stars(n){return "★".repeat(n)+"☆".repeat(5-n)}
function render(){
 const totalPoints = [
  "Grevelingstraat 77, Lisse, Netherlands","Bovensmilde, Netherlands","Malmö, Sweden",
  "Geilo, Norway","Eidfjord, Norway","Flåm, Norway","Borgund Stave Church, Norway",
  "Loen, Norway","Geiranger, Norway","Trollstigen, Norway","Atlantic Ocean Road, Norway",
  "Lom, Norway","Karlstad, Sweden","Amsterdam, Netherlands"
 ];
 document.getElementById("totalMap").href = "https://www.google.com/maps/dir/" + totalPoints.map(encodeURIComponent).join("/");
 document.getElementById("summary").innerHTML = `<div class="card"><h3>Route in één zin</h3>
 <p>Amsterdam → Bovensmilde → Zweden → Hardangervidda → Eidfjord → Hardangerbrug → Flåm/Aurland → Borgund → Loen/Olden → Geiranger → Trollstigen → Atlantic Road → terug via Romsdalen/Jotunheimen → Zweden → Nederland.</p></div>`;
 document.getElementById("stageList").innerHTML = STAGES.map((s,i)=>`
  <div class="card">
    <h3>${s.day} — ${s.title}</h3>
    <div class="meta"><span class="pill">${s.km}</span><span class="pill">${s.time}</span><span class="pill">${s.goal}</span></div>
    <a class="linkbtn" target="_blank" href="${s.maps}">Open dagroute in Google Maps</a>
    <h4>Bezienswaardigheden onderweg</h4>
    ${s.pois.map(p=>`<div class="poi"><div class="stars">${stars(p[1])}</div><div><b>${p[0]}</b><br><span class="muted">${p[2]}</span></div><a target="_blank" class="linkbtn" href="${p[3]}">Pin</a></div>`).join("")}
  </div>`).join("");
 const tasks=["Hardangerbrug","Tunnelrotonde","Lærdaltunnel","Atlantic Road","Geirangerfjord","Trollstigen","Vøringsfossen","Borgund Staafkerk","Schaap gezien","Rendier gezien","Steenmannetje gebouwd","Voeten in een fjord","Noors ijsje","Mooiste camperfoto"];
 const saved=JSON.parse(localStorage.getItem("lotte_v12")||"{}");
 document.getElementById("lotteList").innerHTML=tasks.map((t,i)=>`<label class="check"><input type="checkbox" ${saved[i]?"checked":""} onchange="saveLotte(${i},this.checked)">${t}</label>`).join("");
}
function saveLotte(i,v){const s=JSON.parse(localStorage.getItem("lotte_v12")||"{}");s[i]=v;localStorage.setItem("lotte_v12",JSON.stringify(s))}
render();
