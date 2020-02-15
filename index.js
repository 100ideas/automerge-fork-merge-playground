const am = require("automerge")
const JsonDiffPatch = require("jsondiffpatch")

const msg = `
==========================================================
check out automerge chat transcript in\nREADME.md for 
background info and rough plan on how to set up unidirectional
data merging from parent repo -> forked child.

the repeated code at the bottom demonstrates the 
effect of automerge's non-deterministic merge-conflict-resolution
strategy - probably smart for txt editer, not smart for data-
processing workflows.
==========================================================`


const jsondiffpatch = JsonDiffPatch.create({
  // used to match objects when diffing arrays, by default only === operator is used
  // objectHash: function(obj) {
  // //   // this function is used only to when objects are not equal by ref
  //   // return obj._id || obj.id;
  //   console.log('\n+++++++++ jsondiffpatch unsure obj ref======')
  //   console.log(obj)
  //   return true
  // },
  arrays: {
    // default true, detect items moved inside the array (otherwise they will be registered as remove+add)
    // detectMove: false,
    // default false, the value of items moved is not included in deltas
    // includeValueOnMove: false
  }
})

//====================== helpers =====================================
const diff = (_old, _new) =>
  // JsonDiffPatch.formatters.console.format(jsondiffpatch.diff(_old, _new))
  JsonDiffPatch.formatters.jsonpatch.format(jsondiffpatch.diff(_old, _new))

function log(newline = true) {
  let args = [...arguments]
  if(!newline) args.shift() // remove newline arg

  if(typeof args[0] === 'string') args[0] = '\n// ' + args[0]
  args.map(arg => console.log(arg))
  if(newline) console.log('')
}

// automerge helpers
// also see https://github.com/canadaduane/delta-agent/blob/master/src/diff.js
function logchanges(doc, msg = '') {
  let {actor, message} = getChange(doc, -1)
  log("logchanges() from " + msg, `//\tactor: ${actor}\n//\tmessage: ${message}`)
  let lastChange = {}
  am.getHistory(doc).map(({change, snapshot}, idx) => {
    log(false, '\tchange #' + idx, JSON.stringify(change, null, 1))
    // log('diffed', diff(lastChange, change))
    lastChange = change
  })
}
function getHistory(doc, idx = 0) {
  let _idx = idx
  let history = am.getHistory(doc)
  if (history.length === 0) return {change: 'none', snapshot: 'none'}
  if (idx !== 0 && Math.abs(idx) > 1) idx = (Math.abs(idx) - 1) * (idx/Math.abs(idx))
  // idx = idx !== 0 ? (Math.abs(idx) - 1) * (idx/idx) : 0 // compensate for 0-based index
  // clamp and handle negative idx for reverse array index access
  idx = idx < 0 
    ? history.length + Math.max(idx, -1 * history.length)
    : Math.min(idx, history.length)
  // console.log('!!!!!\n', idx, 'oldidx: ' + _idx, 'length: ' + history.length)
  // history.map(({change, snapshot}, idx) => console.log(idx +':\nchange', change, '\nsnaps', snapshot))
  return history[idx]
}
function getSnapshot(doc, idx = 0) {return getHistory(doc, idx)['snapshot']}

function getAllConflicts(doc) {
  let conflicts = {}
  for (let key of Object.keys(doc)) {
    let conflicted = am.getConflicts(doc, key)
    if(conflicted !== undefined) conflicts[key] = conflicted
  }
  return conflicts
}


//===============================================================
const pipe = (...fns) => x => fns.reduce( (v, f) => f(v), x );

function getChange(doc, idx = 0) {return getHistory(doc, idx)['change']}

function amchange(change, olddoc = am.init(), msg = '') {
  // only for objects right now
  if (typeof change !== 'object') return false
  // handle variadic use
  if (typeof olddoc === 'string') {
    msg += olddoc
    olddoc = am.init()
  }
  let args = [olddoc]
  if(msg !== '') args.push(msg) // msg must be string
  // let changeset = new Map(Object.entries(change))
  let newdoc = am.change(...args, doc => {
    Object.keys(change).map(k => {
      doc[k] = change[k]
    })
  })
  let seqs = Array.of(olddoc, newdoc).map(pipe(
    getChange,
    cn => cn === undefined ? -1 : cn.seq
  ))
  log(`amchange() created: ${msg}`, 
      `in(${seqs[0]}): ${JSON.stringify(olddoc, null, 2)}`, 
      `out(${seqs[1]}): ${JSON.stringify(newdoc, null, 2)}`,
      // 'jsonpatch:', diff(olddoc, newdoc)
  )
  return newdoc
}
//===============================================================

let a1, a2, a3,
    b0, b1, b2, b3;

a1 = amchange({verz: "1", data: [1,2,3], branch: 'master'}, "master:v1")
a2 = amchange({verz: "2", data: [1,2,3,4], msg: 'cat'}, a1, "master:v2")
// b0 = am.from(a2)
// b0 = am.load(am.save(a2))
// b0 = am.merge(am.init(), a2)
b0 = amchange(a2)
b1 = amchange({verz: "3", data: [1,2,3,4,5], branch: 'fork1'}, b0, 'fork1:v1 from master:v2')
a3 = amchange({verz: "3", data: [1,2,3,4,10], extramsg: "change made to master post-fork"}, a2, "master:v3")
b2 = amchange({verz: "4", data: [2,3,4], msg: 'fork1 msg1'}, b1, 'fork1:v2')

// a1 = amchange({verz: "1",  branch: 'master'}, "master:v1")
// a2 = amchange({verz: "2"}, a1, "master:v2")
// a3 = amchange({verz: "3"}, a2, "master:v3")
// b0 = am.from(a2)       // does not preseve history
// // b0 = am.load(am.save(a2)) // fork, preserves ancestry / history 
// b1 = amchange({verz: "3", branch: 'fork1'}, b0, 'fork1:v1 from master:v2')
// b2 = amchange({verz: "4"}, b1, 'fork1:v2')
// let b2_copy = am.load(am.save(b2))

// Automerge.merge(doc1, doc2) is a related function that is useful for testing. It looks for any changes that appear in doc2 but not in doc1, and applies them to doc1, returning an updated version of doc1. 
//
// Note that Automerge.getChanges(oldDoc, newDoc) takes two documents as arguments: an old state and a new state. It then returns a list of all the changes that were made in newDoc since oldDoc. 

// so a3 is now ahead of b2 by 1 commit,
// and b2 is ahead by either 1 or 2 commits (not sure)
// so what will happen if we updated b2 by merging changes from a3?
log('======================= b2_merged_a3 ====================')
log('b2', b2)
log('getHistory b2', am.getHistory(b2)[0].change)
log('getSnapshot(b2)', getSnapshot(b2, -1))
log('a3', a3)
// am.getHistory(b0).map(({change, snapshot}) => console.log("change:", change, "\nsnap:", snapshot))
// logchanges(a3)
let b0_diff_master_head = am.getChanges(a2, a3)
let b0_diff_fork_head = am.getChanges(b0, b2)
// log('am.diff(a2, a3):', JSON.stringify(b0_diff_master_head, null, 2))
// log('am.diff(b0, b2):', JSON.stringify(b0_diff_fork_head, null, 2))
let b0_merge_master_head = am.applyChanges(b0, b0_diff_master_head)
log('b0_merge_master_head', b0_merge_master_head, '\nconflicts', getAllConflicts(b0_merge_master_head))
let b0_merge_master_head_ff_b2 = am.applyChanges(b0_merge_master_head, b0_diff_fork_head)
log('b0_merge_master_head_ff_b2', b0_merge_master_head_ff_b2, '\nconflicts', getAllConflicts(b0_merge_master_head_ff_b2))
let head = b0_merge_master_head_ff_b2
// logchanges(head, 'b0_merge_master_head_ff_b2')
// log('b0 apply diff master head', am.apply)

// log('am.diff(getSnapshot(b2, -1), a3)', am.diff(getSnapshot(b0, -1), a3))
// log('am.diff(b0, b2):', am.diff(b0, b2))
// log('am.diff(b0, a3):   (note b0 === a2)', am.diff(b0, a3))
// log('log(am.getChanges(b0, a3)):\n', am.getChanges(b0, a3))
// log(am.diff(b2, a3)) //RangeError: Cannot diff two states that have diverged
// logchanges(b2)

// what I EXPECT: 
//   changes in a3 since 'fork' (b0 deep-copied a2) applied in-order to b2
//
// what I WANT:
//   1. all changes on 'master' applied to b0, 
//   2. THEN for all changes on 'fork' since b0 to be applied on top
// so the forks changes are always run on top of the master's changes
//
// what ACTUALLY HAPPENS:
//   it appears that for values changed in both branches, there is a conflict,
//   and AM does it's randomly-pick-a-winner resolution strategy
// let b2_merged_a3 = am.merge(b2, a3) 
let b2_merged_a3 = head 
let res = {
  result: b2_merged_a3,
  conflicts: getAllConflicts(b2_merged_a3)
}
log(false, "b0_merge_master_head_ff_b2",
   `(${getChange(b2_merged_a3).actor})`, 
   JSON.stringify(res, null, 1))

// log(false, b2_merged_a3, "//\tconflicts:\n" + JSON.stringify(getAllConflicts(b2_merged_a3), null, 2))

// logchanges(b2_merged_a3)


// let repeats = 10
// log(false, 'am.merge(b2, a3) repeated ' + repeats + ' times')
// while(repeats > 0){
//   let merged = am.merge(am.from(am.load(am.save(b2_copy))), a3)
//   // let conflicts = getAllConflicts(merged)
//   let conflicts = am.getConflicts(merged, 'verz')
//   // log(false, merged, 'conflicts: ', conflicts)
//   log(false, merged)
//   repeats--
// }


// logchanges(b2)
// log('     ------      ')
// logchanges(a3)
// log(getAllConflicts(a3))
// log(am.diff(b0, a3))
// let b2_apply_a3 = am.applyChanges(b2, am.getChanges(b0, a3))

// log('b2_apply_a3\n', b2_apply_a3)

// let c1 = am.applyChanges(b2, am.getChanges(b0, a3))
// let c2 = am.applyChanges(b2, am.getChanges(b0, a3))
// let c3 = am.applyChanges(b2, am.getChanges(b0, a3))
// let c4 = am.applyChanges(b2, am.getChanges(b0, a3))
// let c5 = am.applyChanges(b2, am.getChanges(b0, a3))

// log(c1)
// log(c2)
// log(c3)
// log(c4)
// log(c5)


// // log(am.diff(getSnapshotFrom(-1)))








/**
 * to be honest I am kind of leaning now towards a different approach... instead of CRDT, thinking of implementing a simple 'event-sourcing' type message store that captures append-only log of delta updates to row objects; msgs are keyed something like entityid-branchid-version; then I can computed materialized views of Sets of rows filtered by branchid. 

The tricky part is I want to branchid_2 aggregate view to always recompute if any branchid_1 msgs are received, i.e. instead of proper forking and merging, I want child 'branches' that stay up to date reactively with parent, then apply any of their changes on top

something like `branch2View =  reactiveComputeAggregate( [...branchid-1-msgs, ...branchid-2-msgs] )`

I think this event log will be more terse & human readable when serializing to flat files 
/ disk.
 */



/**
 * 
 * 
a hacky approach is as follows. Import this constant from Automerge's internals:
```const { STATE } = require('automerge/frontend/constants')```
Now if `doc` is an Automerge document, then
```doc[STATE].backendState.getIn(['opSet', 'clock']).toJS()```
returns an object where the keys are actorIds, and the values is the highest change sequence number processed by that actorId (aka a vector clock). Every time you apply any change, the corresponding sequence number will be incremented.

Oh wait, this way is better:
```Automerge.Frontend.getBackendState(doc).getIn(['opSet', 'clock']).toJS()```
(avoids having to import that constant)

 */