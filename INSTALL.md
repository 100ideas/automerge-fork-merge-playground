hard to get npm modules to install from github

was trying to use yarn, now want to use npm

#run = "yarn && yarn start"
#run = "npm install && npm run npmFromGit && npm run start"
#run = "yarn && yarn npmFromGit && yarn start"


---

comments removed from package.json

  "//": [
    {
      "install": "yarn add 'git+https://github.com/automerge/automerge.git'"
    },
    {
      "automerge": "automerge/automerge.git"
    },
    {
      "automerge": "npm i automerge/automerge"
    },
    {
      "npmFromGit": "npm i 'git+https://github.com/automerge/automerge.git'"
    }
  ]