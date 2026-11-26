const {test} = require('node:test');
const assert = require('node:assert/strict');
const {seed,daily,generate,DEMO_DAY,DEMO_MONTH} = require('./dist/engine');

test('December sample is fully covered and shows all calendar types',()=>{
  const state=seed();
  const days=generate(state,DEMO_MONTH,{locks:{}});
  assert.equal(Object.keys(days).length,31);
  assert.equal(state.employees.length,32);
  assert.equal(Object.values(days).flatMap(d=>d.conflicts).length,0);
  function required(date,brand,process='t0') {
    return days[date].needs.find(n=>n.rule.brand===brand&&n.rule.process===process).required;
  }
  assert.equal(required('2026-12-25','b20'),1);
  assert.equal(required('2026-12-25','b21'),0);
  assert.equal(required('2026-12-06','b21'),1);
  assert.equal(required('2026-12-06','b0'),0);
  assert.equal(required('2026-12-07','b22'),2);
  assert.equal(days['2026-12-15'].status.e25,'leave');
  assert.equal(days['2026-12-18'].status.e29,'comp');
});
test('sole employee leave affects both processes and approved backup restores coverage',()=>{
  const state=seed();
  state.exceptions[DEMO_DAY]={e1:'leave'};
  const result=daily(state,DEMO_DAY);
  assert.deepEqual(result.conflicts.map(x=>x.rule),['r2','r3']);
  assert.ok(result.conflicts.every(x=>x.backups.includes('e25')));
  assert.equal(daily(state,DEMO_DAY,{r2:['e25'],r3:['e25']}).conflicts.length,0);
  assert.ok(daily(state,DEMO_DAY,{r2:['e1']}).conflicts.some(x=>x.text.includes('Planned leave')));
});
test('a manual overlap in the same window is blocked',()=>{
  const state=seed();
  const north=state.rules.find(r=>r.brand==='b20'&&r.slot==='AM').id;
  const result=daily(state,DEMO_DAY,{r2:['e25'],[north]:['e25']});
  assert.ok(result.conflicts.some(x=>x.text.includes('overlapping AM')));
});
test('a qualified worker can be reassigned to maximise total coverage',()=>{
  const state=seed();
  state.employees=[{id:'a',off:0,preferred:null},{id:'b',off:0,preferred:null},{id:'c',off:0,preferred:null}];
  state.rules=['r1','r2','r3'].map(id=>({id,slot:'AM',mode:'always',min:1,days:{}}));
  state.assignments=[['r1','a'],['r1','b'],['r2','a'],['r2','c'],['r3','a'],['r3','c']].map(([rule,employee])=>({rule,employee}));
  assert.equal(daily(state,DEMO_DAY).conflicts.length,0);
});
test('leap year contains February 29',()=>{
  assert.equal(Object.keys(generate(seed(),'2028-02',{locks:{}})).length,29);
});

