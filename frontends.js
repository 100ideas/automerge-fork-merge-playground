const am = require("automerge")

let doc = am.change(am.init(), doc => {
  doc.birds = []
})
doc = am.change(doc, doc => {
  doc.birds.push('blackbird')
})
doc = am.change(doc, doc => {
  doc.birds.push('robin')
})