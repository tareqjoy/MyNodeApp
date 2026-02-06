package analytics.job;

import analytics.function.LikeBucketDeltaAggregator;
import analytics.function.LikeBucketWindowFunction;
import analytics.model.likeunlike.LikeBucketCount;
import analytics.model.likeunlike.LikeBucketDelta;
import analytics.model.likeunlike.LikeKafkaMsg;
import analytics.model.likeunlike.LikeUnlikeKafkaMsg;
import analytics.model.likeunlike.PostLikeKafkaMsgDeserializationSchema;
import analytics.serialization.LikeBucketCountSerializationSchema;
import analytics.sink.RedisBucketSink;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.typeinfo.TypeHint;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.java.functions.KeySelector;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.core.execution.CheckpointingMode;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.connector.base.DeliveryGuarantee;

import java.time.Duration;

public class TopLikedPostJob {

    public static void run() throws Exception {
        String redisHostPort = getEnvOrDefault("REDIS_HOST_PORT", "redis://localhost:6379");
        String kafkaHostPost = getEnvOrDefault("KAFKA_HOST_PORT", "localhost:9092");
        // 1. Initialize Stream Execution Environment

        Configuration config = new Configuration();
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(config);
        env.getConfig().setAutoWatermarkInterval(1000L);
        env.enableCheckpointing(60000L, CheckpointingMode.EXACTLY_ONCE);


        // 2. Define Kafka Source
        KafkaSource<LikeUnlikeKafkaMsg> source = KafkaSource.<LikeUnlikeKafkaMsg>builder()
                .setBootstrapServers(kafkaHostPost)
                .setTopics("post-like")
                .setGroupId("analytics-group")
                .setStartingOffsets(OffsetsInitializer.earliest())
                .setValueOnlyDeserializer(new PostLikeKafkaMsgDeserializationSchema())
                .build();

        // 3. Define Stream and assign event-time watermarks
        DataStream<LikeUnlikeKafkaMsg> rawStream = env
                .fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka Source");
        rawStream.print("raw");

        DataStream<LikeKafkaMsg> likeStream = rawStream
                .filter(msg -> "like".equals(msg.getType()))
                .map(msg -> (LikeKafkaMsg) msg)
                .filter(msg -> msg.getMessageObject() != null && msg.getMessageObject().getPostId() != null)
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<LikeKafkaMsg>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                                .withIdleness(Duration.ofSeconds(5))
                                .withTimestampAssigner((event, timestamp) -> extractEventTimeMillis(event))
                );
        likeStream.print("like-events");

        // 4. Aggregate buckets for minute/hour/day windows
        SingleOutputStreamOperator<LikeBucketCount> minuteCounts =
                aggregateBuckets(likeStream, 60);
        SingleOutputStreamOperator<LikeBucketCount> hourCounts =
                aggregateBuckets(likeStream, 3600);
        SingleOutputStreamOperator<LikeBucketCount> dayCounts =
                aggregateBuckets(likeStream, 86400);
        minuteCounts.print("minute-counts");
        hourCounts.print("hour-counts");
        dayCounts.print("day-counts");

        KafkaSink<LikeBucketCount> bucketCountsSink = KafkaSink.<LikeBucketCount>builder()
                .setBootstrapServers(kafkaHostPost)
                .setRecordSerializer(
                        KafkaRecordSerializationSchema.builder()
                                .setTopic("bucket_counts_1m")
                                .setValueSerializationSchema(new LikeBucketCountSerializationSchema())
                                .build()
                )
                .setDeliveryGuarantee(DeliveryGuarantee.AT_LEAST_ONCE)
                .build();
        minuteCounts.sinkTo(bucketCountsSink);

        minuteCounts.sinkTo(new RedisBucketSink(
                redisHostPort,
                "likes",
                "m",
                "chg:likes:global:1h",
                3600,
                60,
                86400,
                86400,
                200
        ));
        hourCounts.sinkTo(new RedisBucketSink(
                redisHostPort,
                "likes",
                "h",
                "chg:likes:global:24h",
                86400,
                3600,
                86400,
                86400,
                200
        ));
        dayCounts.sinkTo(new RedisBucketSink(
                redisHostPort,
                "likes",
                "d",
                "chg:likes:global:30d",
                30L * 86400,
                86400,
                (int) (30L * 86400),
                86400,
                200
        ));

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

    private static long extractEventTimeMillis(LikeKafkaMsg event) {
        long ts = event.getMessageObject().getReactTime();
        if (ts <= 0L) {
            return System.currentTimeMillis();
        }
        return ts < 1_000_000_000_000L ? ts * 1000L : ts;
    }

    private static SingleOutputStreamOperator<LikeBucketCount> aggregateBuckets(
            DataStream<LikeKafkaMsg> likeStream,
            long bucketSizeSeconds
    ) {
        return likeStream
                .map(event -> new LikeBucketDelta(
                        "likes",
                        "global",
                        event.getMessageObject().getPostId(),
                        computeBucketTsSeconds(extractEventTimeMillis(event), bucketSizeSeconds),
                        1L
                ))
                .returns(LikeBucketDelta.class)
                .keyBy(
                        new KeySelector<LikeBucketDelta, Tuple3<String, String, Long>>() {
                            @Override
                            public Tuple3<String, String, Long> getKey(LikeBucketDelta delta) {
                                return Tuple3.of(delta.getSegment(), delta.getPostId(), delta.getBucketTs());
                            }
                        },
                        TypeInformation.of(new TypeHint<Tuple3<String, String, Long>>() {})
                )
                .window(TumblingEventTimeWindows.of(Duration.ofSeconds(bucketSizeSeconds)))
                .aggregate(new LikeBucketDeltaAggregator(), new LikeBucketWindowFunction());
    }

    private static long computeBucketTsSeconds(long eventTimeMillis, long bucketSizeSeconds) {
        long eventSeconds = eventTimeMillis / 1000L;
        return (eventSeconds / bucketSizeSeconds) * bucketSizeSeconds;
    }

    private static String getEnvOrDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value == null || value.isEmpty()) ? defaultValue : value;
    }
}
