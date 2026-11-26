const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DEMO_MONTH = '2026-12';
const DEMO_DAY = '2026-12-08';
const labels = {work:'Working',idle:'Available',off:'Weekly off',holiday:'Public holiday',leave:'Planned leave',comp:'Comp-off',unavailable:'Unavailable'};
const dateKey = (month, day) => month + '-' + String(day).padStart(2,'0');
const weekday = date => new Date(date + 'T12:00:00Z').getUTCDay();
function seed() {
  const names = ['Aarav Shah','Meera Rao','Kabir Patel','Isha Nair','Vivaan Mehta','Diya Joshi','Aditya Sen','Anaya Das','Arjun Roy','Riya Malik','Neel Jain','Tara Bhat','Rohan Menon','Nisha Kulkarni','Dev Iyer','Sara Khan','Aryan Bose','Kavya Sethi','Yash Desai','Myra Gill','Reyansh Paul','Avni Kapoor','Ishaan Singh','Aditi Dutta','Dhruv Bedi','Sana Ali','Vihaan Sood','Jiya Reddy','Neil Anand','Zoya Mir','Om Sharma','Pia Ghosh'];
  const brands = ['Fern & Fig','Urban Loom','Earthkind','Mango Lane','Copper Cup','Luna Pet','Banyan Basics','Blue Nest','Wild Mint','Saffron House','Pocket Pantry','Everyday Trail','Home Theory','Pebble Play','Bright Basket','Indigo Roots','Paper Poppy','Slow Sunday','Cocoa Parcel','Good Grain','True North','Daily Drift','Olive Room','Soft Steps','Fresh Fold'].map((name,i)=>({id:'b'+i,name,pod:'p'+Math.floor(i/5)}));
  const employees = names.map((name,i)=>({id:'e'+i,name,pod:i<20?'p'+Math.floor(i/5):'p4',off:i===30?1:i<25||i===31?0:6,preferred:i%7===0?6:null}));
  const pods = ['Maple','Cedar','Birch','Willow','Oak'].map((name,i)=>({id:'p'+i,name,lead:'e'+i*5}));
  const processes = ['Customer Support','Abandoned Cart','NDR','Retention'].map((name,i)=>({id:'t'+i,name}));
  const rules=[], assignments=[];
  const add = (brand,process,mode,slot,people,min=1,days={})=>{
    const id='r'+rules.length;
    rules.push({id,brand:'b'+brand,process:'t'+process,mode,slot,min,days});
    people.forEach(i=>assignments.push({employee:'e'+i,rule:id}));
  };
  for(let i=0;i<20;i++){
    add(i,0,'standard','AM',[i]);
    if(i%2===0) add(i,1,'standard','PM',[i]);
    if(i===1) add(i,3,'standard','PM',[i]);
  }
  add(20,0,'always','AM',[20,25]);
  add(20,1,'standard','PM',[20]);
  add(21,0,'holiday','AM',[21,26]);
  add(21,2,'standard','PM',[26,21]);
  add(22,0,'standard','AM',[22,27],1,{1:2});
  add(22,3,'standard','PM',[22]);
  add(23,0,'standard','AM',[23,28,30],2,{6:1});
  add(23,2,'holiday','PM',[28,30]);
  add(24,0,'always','AM',[24,29,31]);
  add(24,1,'standard','PM',[24,29]);
  add(24,3,'standard','PM',[31]);
  assignments.push({employee:'e25',rule:'r2',backup:true});
  assignments.push({employee:'e25',rule:'r3',backup:true});
  return {pods,brands,employees,processes,rules,assignments,holidays:{'2026-12-25':'Christmas Day'},exceptions:{'2026-12-15':{e25:'leave'},'2026-12-18':{e29:'comp'}},plans:{}};
}
function demand(rule,date,holiday) {
  const day=weekday(date);
  if(rule.mode==='standard' && day===0 || rule.mode!=='always' && holiday) return 0;
  return Object.hasOwn(rule.days,day)?rule.days[day]:rule.min;
}
function available(employee,date,state) {
  return state.exceptions[date]?.[employee.id] || (weekday(date)===employee.off?'off':null);
}
function daily(state,date,locks={},prior=null) {
  const holiday=state.holidays[date];
  const people=new Map(state.employees.map(e=>[e.id,e]));
  const status=Object.fromEntries(state.employees.map(e=>[e.id,available(e,date,state)||(holiday?'holiday':'idle')]));
  const needs=state.rules.map(rule=>({rule,required:demand(rule,date,holiday),staff:[]}));
  const conflicts=[];
  for(const window of ['AM','PM']){
    const tasks=[];
    const occupied=new Map();
    const current=needs.filter(item=>item.rule.slot===window);
    for(const item of current){
      const {rule,required,staff}=item;
      const linked=state.assignments.filter(a=>a.rule===rule.id && people.has(a.employee));
      const eligible=new Set(linked.map(a=>a.employee));
      const locked=Object.hasOwn(locks,rule.id);
      for(const id of locked?locks[rule.id]:[]){
        const reason=!required?'process closed':!eligible.has(id)?'employee is not assigned':available(people.get(id),date,state)?labels[available(people.get(id),date,state)]:occupied.has(id)?'overlapping '+window+' assignment':null;
        if(reason){conflicts.push({rule:rule.id,text:(people.get(id)?.name||id)+' cannot be scheduled: '+reason});continue;}
        staff.push(id);
        occupied.set(id,{fixed:true});
      }
      if(locked) continue;
      const candidates=linked.filter(a=>!a.backup && !available(people.get(a.employee),date,state)).map(a=>a.employee);
      candidates.sort((a,b)=> {
        const preference = id=>Number(people.get(id).preferred===weekday(date))*2-Number(prior?.[rule.id]?.includes(id));
        return preference(a)-preference(b);
      });
      for(let i=0;i<required;i++) tasks.push({item,candidates});
    }
    tasks.sort((a,b)=>a.candidates.length-b.candidates.length);
    function match(task,seen){
      for(const id of task.candidates){
        if(seen.has(id))continue;
        seen.add(id);
        const existing=occupied.get(id);
        if(existing?.fixed)continue;
        if(!existing || match(existing,seen)){occupied.set(id,task);return true;}
      }
      return false;
    }
    tasks.forEach(task=>match(task,new Set()));
    for(const [id,task] of occupied) if(!task.fixed) task.item.staff.push(id);
  }
  const warnings=[];
  for(const item of needs){
    const {rule,required,staff}=item;
    for(const id of staff){
      status[id]='work';
      if(people.get(id).preferred===weekday(date)) warnings.push({rule:rule.id,text:people.get(id).name+' is working on their preferred day off.'});
    }
    if(staff.length>=required)continue;
    const related=state.assignments.filter(a=>a.rule===rule.id);
    const details=related.map(a=>{
      const e=people.get(a.employee);
      if(!e)return '';
      const block=available(e,date,state);
      const booking=needs.find(n=>n.rule.slot===rule.slot && n.staff.includes(e.id));
      return e.name+' ('+(block?labels[block]:booking?'already booked in '+rule.slot:a.backup?'trained backup':'eligible')+')';
    }).filter(Boolean);
    const backups=related.filter(a=>a.backup && people.has(a.employee) && !available(people.get(a.employee),date,state) && !needs.some(n=>n.rule.slot===rule.slot && n.staff.includes(a.employee))).map(a=>a.employee);
    conflicts.push({rule:rule.id,backups,text:`${staff.length}/${required} staffed in ${rule.slot}. ${details.length?details.join(', '):'No employees assigned.'}`});
  }
  return {status,needs,conflicts,warnings};
}
function generate(state,month,plan){
  const [year,m]=month.split('-').map(Number);
  const count=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Object.fromEntries(Array.from({length:count},(_,index)=>{
    const date=dateKey(month,index+1);
    const former=plan.days?.[date]?.needs;
    const previous=former&&Object.fromEntries(former.map(item=>[item.rule.id,item.staff]));
    return [date,daily(state,date,plan.locks[date],previous)];
  }));
}
if(typeof module!=='undefined')module.exports={seed,daily,generate,DEMO_DAY,DEMO_MONTH};

