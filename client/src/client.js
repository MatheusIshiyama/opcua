import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  makeBrowsePath,
  ClientSubscription,
  TimestampsToReturn,
  ClientMonitoredItem,
} from "node-opcua";

const connectionStrategy = {
  initialDelay: 1000,
  maxRetry: 1,
};
const options = {
  applicationName: "MyClient",
  connectionStrategy: connectionStrategy,
  securityMode: MessageSecurityMode.None,
  securityPolicy: SecurityPolicy.None,
  endpointMustExist: false,
};
const client = OPCUAClient.create(options);
const endpointUrl = "opc.tcp://localhost:4334/UA/MyLittleServer";
async function main() {
  try {
    // step 1 : connect to
    await client.connect(endpointUrl);
    console.log("connected !");

    // step 2 : createSession
    const session = await client.createSession();
    console.log("session created !");

    // step 3 : browse
    const browseResult = await session.browse("RootFolder");

    console.log("references of RootFolder :");
    for (const reference of browseResult.references) {
      console.log("   -> ", reference.browseName.toString());
    }

    // step 4' : read a variable with read
    const maxAge = 0;
    const nodeToRead = {
      nodeId: "ns=1;b=1020FFAA",
      attributeId: AttributeIds.Value,
    };
    const dataValue = await session.read(nodeToRead, maxAge);
    console.log(" value ", dataValue.toString());

    // step 5: install a subscription and install a monitored item for 10 seconds
    const subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });

    subscription
      .on("started", function () {
        console.log(
          "subscription started for 2 seconds - subscriptionId=",
          subscription.subscriptionId
        );
      })
      .on("keepalive", function () {
        console.log("keepalive");
      })
      .on("terminated", function () {
        console.log("terminated");
      });

    // install monitored item

    const itemToMonitor = {
      nodeId: "ns=1;b=1020FFAA",
      attributeId: AttributeIds.Value,
    };
    const parameters = {
      samplingInterval: 100,
      discardOldest: true,
      queueSize: 10,
    };

    const monitoredItem = ClientMonitoredItem.create(
      subscription,
      itemToMonitor,
      parameters,
      TimestampsToReturn.Both
    );

    monitoredItem.on("changed", (dataValue) => {
      console.log(" value has changed : ", dataValue.value.toString());
    });

    async function timeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    await timeout(10000);

    console.log("now terminating subscription");
    await subscription.terminate();

    // step 6: finding the nodeId of a node by Browse name
    const browsePath = makeBrowsePath(
      "RootFolder",
      "/Objects/Server.ServerStatus.BuildInfo.ProductName"
    );

    const result = await session.translateBrowsePath(browsePath);
    const productNameNodeId = result.targets[0].targetId;
    console.log(" Product Name nodeId = ", productNameNodeId.toString());

    // close session
    await session.close();

    // disconnecting
    await client.disconnect();
    console.log("done !");
  } catch (err) {
    console.log("An error has occured : ", err);
  }
}
main();
