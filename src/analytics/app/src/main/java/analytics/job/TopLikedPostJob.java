package analytics.job;

import analytics.model.likeunlike.LikeUnlikeKafkaMsg;
import analytics.model.likeunlike.PostLikeKafkaMsgDeserializationSchema;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;

public class TopLikedPostJob {

    public static void run() throws Exception {
        // 1. Initialize Stream Execution Environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.getConfig().setAutoWatermarkInterval(1000L);

        // 2. Define Kafka Source
        KafkaSource<LikeUnlikeKafkaMsg> source = KafkaSource.<LikeUnlikeKafkaMsg>builder()
                .setBootstrapServers("localhost:9092")
                .setTopics("post-like")
                .setGroupId("analytics-group")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new PostLikeKafkaMsgDeserializationSchema())
                .build();

        // 3. Define Stream with Watermarks
        DataStream<LikeUnlikeKafkaMsg> rawStream = env.fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka Source");
        rawStream.print();
/*
        // 5. Key the stream by postId
        KeyedStream<LikeUnlikeKafkaMsg, String> keyedStream = rawStream.keyBy(msg -> {
            // Determine the type and cast messageObject accordingly to get postId
            if ("like".equals(msg.getType())) {
                return ((LikeReq) msg).getPostId(); // Cast to LikeReq
            } else if ("unlike".equals(msg.getType())) {
                return ((UnlikeReq) msg).getPostId(); // Cast to UnlikeReq
            }
            return null; // Fallback in case type is not like or unlike
        });

        // 6. Apply Windowing and Aggregate likes per post
        SingleOutputStreamOperator<PostLikeCount> aggregatedStream = keyedStream
                .window(TumblingEventTimeWindows.of(Duration.ofMinutes(10)))
                .aggregate(new LikeCountAggregator(), new TopPostWindowFunction());

        // 7. Print the top liked post
        aggregatedStream.print();
*/
        // 8. Execute the Flink job
        env.execute("Top Liked Post Analytics");
    }

    public static void runForString() throws Exception {
        // 1. Initialize Stream Execution Environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.getConfig().setAutoWatermarkInterval(1000L);

        // 2. Define Kafka Source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers("localhost:9092")
                .setTopics("post-like")
                .setGroupId("analytics-group")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        // 3. Define Stream with Watermarks
        DataStream<String> rawStream = env.fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka Source");;

        rawStream.print();

        // 8. Execute the Flink job
        env.execute("Top Liked Post Analytics");
    }
}
