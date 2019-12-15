# tradeshift-challenge

Tradeshift challenge

# endpoints

Create the root node.
curl -X POST 'http://localhost:8080/api/v1/nodes'

return 201 Created, with the node information about node created
`{"id":"5df422bb0764030010dee191","depth":0,"root":"5df422bb0764030010dee191"}`

Attempting to create multiple roots returns 405 Method Not Allowed

Create child nodes from a given parent
curl -X POST http://localhost:8080/api/v1/nodes?parent=5df422bb0764030010dee191

return 201 Created
`{"id":"5df4233b0764030010dee192","parent":"5df422bb0764030010dee191","depth":1,"root":"5df422bb0764030010dee191"}`

Get a nodes descendants
curl http://localhost:8080/api/v1/nodes/5df422bb0764030010dee191/descendants

returns 200 OK, with an array of the descenants info
`[{"id":"5df4233b0764030010dee192","parent":"5df422bb0764030010dee191","depth":1,"root":"5df422bb0764030010dee191"}]`

Set the parent for an existing node
curl -X PATCH http://localhost:8080/api/v1/nodes/5df4271d0764030010dee196?parent=5df4270b0764030010dee195

returns 200 OK, with the node's new information

`{"id": "5df4271d0764030010dee196", "parent": "5df4270b0764030010dee195", "depth": 2, "root": "5df422bb0764030010dee191"}`
