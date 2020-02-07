# automerge v0.12.0 playground - forking


Goal with this playground was to learn if and how a "descendant" automerge could be "forked" off of a parent, remaining in sync with / "shadowing" the parents' updates, but overriding the inherited values with local changes, if any, but not propagating these back to the parent. So, Forking, Reactive Shadowing, and unidirectional merging parent -> child.

This behaviour is analagous the common github forking + PR workflow, except the goal here is to make the automerge dataflow graph reactive and automatic, manual committing optional. Github analogy:
1. fork remote repository; set as 'upstream' remote 
2. upstream AKA parent's changes can be merged with local AKA descendant's repo, but not vice versa)
3. create branches, make commits, push changes up to origin master
4. repeat steps 2 & 3 until
5. optionally requesting upstream parent repo synchronize with child repo (pull request)

This use case tends to be out of scope of most of the eventually-consistent distributed data frameworks in the js ecosystem that I've checked out. This makes sense considering 1) "eventually consistent" is the general category and 2) the primary design goal to perfectly and automatically synchronize all instances of the distributed store - diverging forks are not seen as useful (yet).

That said, a basic `fork` function has been in `hypermerge repofrontend` since [2019-nov-29 commit b593860](https://github.com/automerge/hypermerge/commit/b593860b806a4db78b630e0d52e50fbd4e6850b9) ([latest version](https://github.com/automerge/hypermerge/blob/master/src/RepoFrontend.ts#L101)). It works like `repo.front.fork = (url: DocUrl): DocUrl => {...}`

Read the chatlog below for a suggestion on a simple & dumb way to set up deterministic forking & shadowing:


## 2019-09-24 automerge slack chat #general

#### @100ideas: 
is it possilbe yet to create a 'fork' for an automerge doc...
  1.  make or merge separate changes into the fork and the master docs,
  2.  compute materialized views for master@head, fork@head so they can be compared, 
  3. and then if desired merge fork into master,  something like `master_merge_fork = Automerge.merge(master, fork)`,

  or perhaps 

```js 
// instead of perfect interleaving of all changes, choose one branch head, 
// then apply other branch changes on top, these changes always win in case of conflict
master_changes = Automerge.getChanges(forkPointSnapshot, master@head);  
fork_changes = Automerge.getChanges(forkPointSnapshot, fork@head);
master_merge_fork = Automerge.applyChanges(fork@head, master@head) // want all conflicts resolved to master's changes
```

related discussion: https://github.com/automerge/automerge/issues/159

I have experimented w/ automerge, can't see how to do it. experiments here: https://repl.it/@100ideas/playing-with-automerge

Is this possible with hypermerge instead? I have reviewed the docs and tests but can't tell. In my application network syncing is less important than forking, comparing, and merging docs at arbitrary snapshots

####  @martinkl:
Hi @100ideas, at the moment branches/forks of documents are not well supported. You can get some of the way by maintaining two separate documents, and applying some of the changes to only one of the documents. But there is no built-in support for diffing two documents constructed this way.

I don't think Hypermerge does this either. We did experiment with branching on the Pixelpusher project (https://medium.com/@pvh/pixelpusher-real-time-peer-to-peer-collaboration-with-react-7c7bc8ecbf74) by maintaining separate docs for each branch as described, but the performance was not great.

Last week when I met with @pvh one of the things we discussed was actually better support for branching/forking. We have ideas on how to do this, but not implemented yet.


#### @100ideas: 
in my experiments I tried a variety of ways of doing that (variations on how to initialize the fork: with ancestors changes; blank from automerge.init(), etc), but I couldn't reliably find a way to ensure one branchs conflicts would always win after merging back.

writing it out now, I realize that I probably needed to go one step further and scan the final merged doc for all conflicts, then "manually" resolve them in favor of the desired branch besed on its docId

####  @martinkl:
Yes, in the current design, if you change a property value on two branches and then merge, you will get a conflict, and the default resolution chosen is indeterminate. There currently isn't a way of saying that all values from one particular branch should win.

Scanning the documents looking for conflicts is probably the best way of dealing with it.


#### @100ideas: 
previously I implemented a unidirectional reactive dataflow between two schemaless tables using mobx. updates to the parent store propogated and reactively updated on the child store, unless the child store had made a change to that particular element. but changes to the child store would not reactively update the parent store.

here is a temporary demo http://4187fae7.ngrok.io

I'm sure it could be cleaned up a lot, but my experience was that it was pretty hairy to create the mobx class / field accessors for the table store due to needing to resolve deep property nesting in certain ways

on the topic of mobx, is it possible attach change handlers that trigger when an automerge doc is changed? I saw some tests for `Automerge.WatchableDoc(doc).registerHandler(callback_func)` but didn't see any docs... is WatchableDoc available in automerge or hypermerge? http://github.com/automerge/automerge/blob/master/test/watchable_doc_test.js (github.com/automerge/automerge/blob/master/test/watchable_doc_test.js)


####  @martinkl:
WatchableDoc is a simple class that ships with Automerge https://github.com/automerge/automerge/blob/master/src/watchable_doc.js

What do you want to do in the change handler? Is it sufficient to get a reference to the new document, or do you need a diff of what has changed compared to the previous version?


#### @100ideas: 
cool. if I end up pursuing this with automerge, I'll probably try the technique described above to force a winner for conflicts & try integrating mobx using WatchableDoc.

just getting the new doc is fine, I can keep track of snapshots separately for computing diffsets

actually on that note, is there a single value or combination of values that can be used to reference an arbitrary version of an AM doc? I know I could keep track of the getHistory() index, but maybe there is a more reliable way w/ `seq` or something?


####  @martinkl:
Hmm, good question. There is, but I don't think it's currently exposed in the API. Let me check…


#### @pvh:
@100ideas we did a lot of experimenting in pixelpusher with this stuff, and i think if someone was working actively on it it might be worth reviving the old thread there about better fork / branch support

but if you grab http://github.com/inkandswitch/pixelpusher (github.com/inkandswitch/pixelpusher) you can play with it. note that it's written against an older automerge.


####  @martinkl:
***a hacky approach is as follows. Import this constant from Automerge's internals:
```const { STATE } = require('automerge/frontend/constants')```

Now if `doc` is an Automerge document, then
```doc[STATE].backendState.getIn(['opSet', 'clock']).toJS()```
returns an object where the keys are actorIds, and the values is the highest change sequence number processed by that actorId (aka a vector clock). Every time you apply any change, the corresponding sequence number will be incremented.

Oh wait, this way is better:
```Automerge.Frontend.getBackendState(doc).getIn(['opSet', 'clock']).toJS()```
(avoids having to import that constant)***


#### @100ideas: 
to be honest I am kind of leaning now towards a different approach... instead of CRDT, thinking of implementing a simple 'event-sourcing' type message store that captures append-only log of delta updates to row objects; msgs are keyed something like entityid-branchid-version; then I can computed materialized views of Sets of rows filtered by branchid. 

The tricky part is I want to branchid_2 aggregate view to always recompute if any branchid_1 msgs are received, i.e. instead of proper forking and merging, I want child 'branches' that stay up to date reactively with parent, then apply any of their changes on top

something like `branch2View =  reactiveComputeAggregate( [...branchid-1-msgs, ...branchid-2-msgs] )`

I think this event log will be more terse & human readable when serializing to flat files 
/ disk.