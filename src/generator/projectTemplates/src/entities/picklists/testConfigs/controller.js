module.exports = {
    'getTypeList': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['result=><array>']
    },
    'get': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['result=><object>']
    },
    'post': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['record=><object>']
    },
    'put': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"body": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['record=><object>']
    },
    'delete': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['record=><object>']
    },
    'find': {
        input: [
            'req=><object<IncomingMessage> required=:[{"client.server": "object"}, {"params": "object"}]>',
            'res=><object<ServerResponse> required=:[{"socket.server": "object"}]>'
        ],
        output: ['record=><array>']
    }
}
