export const resolverABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_root",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "type": "error",
    "name": "AddressEmptyCode"
  },
  {
    "inputs": [],
    "type": "error",
    "name": "FailedCall"
  },
  {
    "inputs": [],
    "type": "error",
    "name": "InvalidDomain"
  },
  {
    "inputs": [],
    "type": "error",
    "name": "NotAuthorized"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "address",
        "name": "addr",
        "type": "address",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "AddrChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "bytes",
        "name": "contenthash",
        "type": "bytes",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "ContenthashChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "bytes",
        "name": "name",
        "type": "bytes",
        "indexed": false
      },
      {
        "internalType": "uint16",
        "name": "resource",
        "type": "uint16",
        "indexed": false
      },
      {
        "internalType": "bytes",
        "name": "record",
        "type": "bytes",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "DNSRecordChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "bytes",
        "name": "zonehash",
        "type": "bytes",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "DNSZonehashChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string",
        "indexed": true
      },
      {
        "internalType": "bytes",
        "name": "value",
        "type": "bytes",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "DataChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32",
        "indexed": true
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string",
        "indexed": true
      },
      {
        "internalType": "string",
        "name": "value",
        "type": "string",
        "indexed": false
      }
    ],
    "type": "event",
    "name": "TextChanged",
    "anonymous": false
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "name": "addr",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ]
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "name": "contenthash",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ]
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "name": "getData",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ]
  },
  {
    "inputs": [
      {
        "internalType": "bytes[]",
        "name": "data",
        "type": "bytes[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "multicall",
    "outputs": [
      {
        "internalType": "bytes[]",
        "name": "results",
        "type": "bytes[]"
      }
    ]
  },
  {
    "inputs": [],
    "stateMutability": "view",
    "type": "function",
    "name": "root",
    "outputs": [
      {
        "internalType": "contract IDomain",
        "name": "",
        "type": "address"
      }
    ]
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "address",
        "name": "addr",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "setAddr"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "hash",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "setContenthash"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "value",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "setData"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "value",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "setText"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "dnsEncoded",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "name": "text",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ]
  }
];