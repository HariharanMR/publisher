import { PubSub } from '@google-cloud/pubsub';

// Generate the topic
const topicGenerate = async (
    projectId: any, // Google Cloud Platform project ID
    topicNameOrId: string, // Name for the new topic to create // Name for the new subscription to create
) => {
    // Instantiates a client
    return new Promise(async (resolve, reject) => {
        try {
            let pubsub: any = new PubSub({
                projectId: projectId,
                credentials: {
                     client_email: process.env.PUBSUB_CLIENT_EMAIL,
                    private_key: process.env.PUBSUB_PRIVATE_KEY
                },
            });

            // Creates a new topic
            let topic = pubsub.topic(topicNameOrId);
            let isExistTopic = await topic.exists();
            if (isExistTopic.length && !isExistTopic[0]) {
                const [topics] = await pubsub.createTopic(topicNameOrId);
                topic = topics;
            }
            resolve(topic);
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

export default topicGenerate;