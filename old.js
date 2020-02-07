function log(newline = true) {
  let args = [...arguments]
  if(!newline) args.shift() // remove newline arg

  // center-spacing
  // if(args.length > 1 && args[0].length < 38 && typeof args[0] === 'string') {
    // let pad = Math.round((40 - args[0].length) / 2 - 0.2)
    // pad = new Array(pad).fill('-').join('')'
    // args[0] = pad + ' ' + args[0] + ' ' + pad
  // }

  // right pad to 80 with '-'
  // if(args[0].length < 80 && typeof args[0] === 'string') {
  //   let pad = new Array(77 - args[0].length).fill('-').join('')
  //   args[0] = '\n// ' + args[0] + ' ' + pad
  // }

  if(typeof args[0] === 'string') args[0] = '\n// ' + args[0] + ':'
  args.map(arg => console.log(arg))
  if(newline) console.log('')
}

function getChange(doc, idx = 0) {
  let changes = am.getHistory(doc).map(({change, snapshot}) => change)
  if (idx > changes.length - 1) {
    console.warn(`array out of bounds: getChange tried to get snapshot[${idx}] but snapshot.length = ${changes.length}`)
    idx = changes.length
  }
  idx = idx < 0 ? changes.length - 2 - idx : idx
  log('getchange idx', idx, 'changes.length: ', changes.length)
  return changes[idx]
}
// use negative idx to go backwards from end of array
function getSnapshot(doc, idx = 0) {
  let snapshots = am.getHistory(doc).map(({change, snapshot}) => snapshot)
  if(Math.abs(idx) > snapshots.length - 1) {
    console.warn(`array out of bounds: getChange tried to get snapshot[${idx}] but snapshot.length = ${snapshots.length}`)
    idx = snapshots.length
  }
  idx = idx < 0 ? snapshots.length - 1 - idx : idx
  return snapshots[idx]
}
function getLatestChange(doc) {
  let changes = am.getHistory(doc).map(({change, snapshot}) => change)
  return changes[changes.length - 1]
}
function getLatestSnapshot(doc) {
  let snapshots = am.getHistory(doc).map(({change, snapshot}) => snapshot)
  return snapshots[snapshots.length - 1]  
}


/**
 * pipe
 * take argument of single-param functions
 * return function that takes single param x
 *   and for each orig function
 *     applies func to x
 *       then passes return val to next func
 *   then returns final val
 */

// function pipe1(...fns){
//   return function(x){
//     return fns.reduce(
//       function(val, func){ 
//        return func(val)
//       },
//       x
//     )
//   }
// } 