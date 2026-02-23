const { v4: uuidv4 } = require('uuid');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');


//sqs client
const sqsClient = new SQSClient({ region: process.env.REGION });

const { DynamoDBClient } = require ("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require ("@aws-sdk/lib-dynamodb");

// Create a DynamoDB client
const client = new DynamoDBClient({ region: process.env.REGION }); 

// Create a DynamoDB document client
const docClient = DynamoDBDocumentClient.from(client);


exports.newOrder = async (event) => {
    
   const orderId = uuidv4();
   console.log(orderId);

   let orderDetails;
   try {
    orderDetails = JSON.parse(event.body)    
   } catch (error) {
    console.error("Error parsing order details:", error);
    return {
        statusCode: 400,
        body: JSON.stringify({message: "Invalid JSON format in order details"}),
    };    
   }
   
   console.log(orderDetails)

   const order = {orderId, ...orderDetails}

   await saveItemtoDynamoDB(order)

   const PENDING_ORDERS_QUEUE_URL = process.env.PENDING_ORDER_QUEUE_URL

   await sendMessageToSqs(order, PENDING_ORDERS_QUEUE_URL)


   return {
    statusCode: 200,
    body: JSON.stringify({
        message: order
    }),
};
}   

exports.getOrder = async (event) => {
    console.log(event);

    const orderId = event.pathParameters.orderId

    const orderDetails = {
        "pizza": "Margarita",
        "customerId": 1,
        "order_status": "COMPLETED"
    };

    const order = {orderId,...orderDetails}

    console.log(order);
    
    return {
        statusCode: 200,
        body: JSON.stringify({message: order})
    };
}

exports.prepOrder = async(event) => {
    console.log(event);
    

    
    return {
        statusCode: 200,
        body: JSON.stringify({message: "Order in preparation"})
    };
}

exports.sendOrder = async(event) => {
    console.log(event);

    const order = {
        orderId: event.orderId,
        pizza: event.pizza,
        customerId: event.customerId
    }

    const ORDERS_TO_SEND_QUEUE = process.env.ORDERS_TO_SEND_QUEUE

    await sendMessageToSqs(order, ORDERS_TO_SEND_QUEUE)

    return; 
    }



async function sendMessageToSqs(message, queueURL) {
    
  const params = {
    QueueUrl: queueURL,
    MessageBody: JSON.stringify(message)
  };
  
  try {
    const command = new SendMessageCommand(params);
    const data = await sqsClient.send(command);
    console.log("Message sent to SQS successfully", data.MessageId);
    return data;
  } catch (error) {
    console.error("Error sending message to SQS:", error)
    throw error;    
  }
}

async function saveItemtoDynamoDB(item){

    const params = {
        TableName: process.env.ORDERS_TABLE,
        Item: item
    };

    console.log(params);

    try {
        const command = new PutCommand(params);
        const response = await docClient.send(command);
        console.log("item saved to dynamodb", response);
        return response;
    } catch (error) {
        console.error("Error saving item to dynamodb", error);
        throw error;        
    }

 }
