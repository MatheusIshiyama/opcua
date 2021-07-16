import * as opcua from "node-opcua";
import os from "os";

const server = new opcua.OPCUAServer({
  port: 4334,
  resourcePath: "/UA/MyLittleServer",
  buildInfo: {
    productName: "MyLittleServer",
    buildNumber: "0001",
    buildDate: new Date(),
  },
});

function post_initialize() {
  console.log("Initialized");

  function construct_my_address_space(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    const device = namespace.addObject({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: "MyDevices",
    });

    let variable1 = 1;

    setInterval(() => variable1++, 500);

    namespace.addVariable({
      componentOf: device,
      nodeId: "ns=1;b=1020FFAA",
      browseName: "MyVariable1",
      dataType: "Double",
      value: {
        get: function () {
          return new opcua.Variant({ dataType: opcua.DataType.Double, value: variable1 });
        },
      },
    });

    let variable2 = 10.0;

    namespace.addVariable({
      componentOf: device,
      nodeId: "ns=1;b=1020FFAB", // some opaque NodeId in namespace 4
      browseName: "MyVariable2",
      dataType: "Double",
      value: {
        get: function () {
          return new opcua.Variant({ dataType: opcua.DataType.Double, value: variable2 });
        },
        set: function (variant) {
          variable2 = parseFloat(variant.value);
          return opcua.StatusCodes.Good;
        },
      },
    });

    /**
     * @return {double}
     */
    function available_memory() {
      const percentageMemUsed = (os.freemem() / os.totalmem()) * 100.0;
      return percentageMemUsed;
    }

    namespace.addVariable({
      componentOf: device,
      nodeId: "s=free_memory", // a string nodeID
      browseName: "FreeMemory",
      dataType: "Double",
      value: {
        get: function () {
          return new opcua.Variant({ dataType: opcua.DataType.Double, value: available_memory() });
        },
      },
    });
  }

  construct_my_address_space(server);

  server.start(function () {
    console.log("Server is now listening ... ( press CTRL+C to stop)");
    console.log("port ", server.endpoints[0].port);
    const endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
    console.log(" the primary server endpoint url is ", endpointUrl);
  });
}

server.initialize(post_initialize);
