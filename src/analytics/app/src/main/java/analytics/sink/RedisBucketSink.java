package analytics.sink;

import analytics.model.likeunlike.LikeBucketCount;
import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.api.connector.sink2.SinkWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Pipeline;
import redis.clients.jedis.Response;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class RedisBucketSink implements Sink<LikeBucketCount> {
    private static final Logger LOG = LoggerFactory.getLogger(RedisBucketSink.class);
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_BACKOFF_MILLIS = 500L;

    private final String redisHostPort;
    private final String metric;
    private final String bucketSuffix;
    private final String changedSetKey;
    private final long retentionSeconds;
    private final long bucketSizeSeconds;
    private final int ttlSeconds;
    private final int changedSetTtlSeconds;
    private final int batchSize;

    public RedisBucketSink(
            String redisHostPort,
            String metric,
            String bucketSuffix,
            String changedSetKey,
            long retentionSeconds,
            long bucketSizeSeconds,
            int ttlSeconds,
            int changedSetTtlSeconds,
            int batchSize
    ) {
        this.redisHostPort = redisHostPort;
        this.metric = metric;
        this.bucketSuffix = bucketSuffix;
        this.changedSetKey = changedSetKey;
        this.retentionSeconds = retentionSeconds;
        this.bucketSizeSeconds = bucketSizeSeconds;
        this.ttlSeconds = ttlSeconds;
        this.changedSetTtlSeconds = changedSetTtlSeconds;
        this.batchSize = batchSize;
    }

    @Override
    public SinkWriter<LikeBucketCount> createWriter(InitContext context) {
        return new RedisBucketSinkWriter();
    }

    private class RedisBucketSinkWriter implements SinkWriter<LikeBucketCount> {
        private Jedis jedis;
        private final List<LikeBucketCount> buffer = new ArrayList<>(batchSize);

        private RedisBucketSinkWriter() {
            try {
                this.jedis = connectWithRetry();
            } catch (IOException | InterruptedException e) {
                throw new RuntimeException("Redis connection failed", e);
            }
        }

        @Override
        public void write(LikeBucketCount value, Context context) throws IOException, InterruptedException {
            buffer.add(value);
            if (buffer.size() >= batchSize) {
                flushInternal();
            }
        }

        @Override
        public void flush(boolean endOfInput) throws IOException, InterruptedException {
            flushInternal();
        }

        @Override
        public void close() {
            try {
                flushInternal();
            } catch (Exception e) {
                LOG.warn("Failed to flush Redis sink on close: {}", e.getMessage());
            }
            if (jedis != null) {
                jedis.close();
            }
        }

        private void flushInternal() throws IOException, InterruptedException {
            if (buffer.isEmpty() || jedis == null) {
                return;
            }
            int attempt = 0;
            while (true) {
                try {
                    ensureConnected();
                    Pipeline pipeline = jedis.pipelined();
                    List<RetentionCleanup> cleanups = new ArrayList<>();
                    long nowSeconds = Instant.now().getEpochSecond();
                    long cutoff = 0L;
                    if (retentionSeconds > 0) {
                        long rawCutoff = Math.max(0L, nowSeconds - retentionSeconds);
                        cutoff = (rawCutoff / bucketSizeSeconds) * bucketSizeSeconds;
                    }
                    for (LikeBucketCount record : buffer) {
                        String key = String.format(
                                "b:%s:%s:%s:%s",
                                metric,
                                record.getSegment(),
                                record.getPostId(),
                                bucketSuffix
                        );
                        String idxKey = key + ":idx";
                        pipeline.hset(
                                key,
                                String.valueOf(record.getBucketTs()),
                                String.valueOf(record.getCount())
                        );
                        pipeline.zadd(idxKey, record.getBucketTs(), String.valueOf(record.getBucketTs()));
                        if (retentionSeconds > 0) {
                            cleanups.add(new RetentionCleanup(
                                    key,
                                    pipeline.zrangeByScore(idxKey, "-inf", "(" + cutoff)
                            ));
                            pipeline.zremrangeByScore(idxKey, "-inf", "(" + cutoff);
                        }
                        if (ttlSeconds > 0) {
                            pipeline.expire(key, ttlSeconds);
                            pipeline.expire(idxKey, ttlSeconds);
                        }
                        if (changedSetKey != null && !changedSetKey.isEmpty()) {
                            pipeline.sadd(changedSetKey, record.getPostId());
                            if (changedSetTtlSeconds > 0) {
                                pipeline.expire(changedSetKey, changedSetTtlSeconds);
                            }
                        }
                    }
                    pipeline.sync();
                    if (!cleanups.isEmpty()) {
                        Pipeline cleanupPipeline = jedis.pipelined();
                        for (RetentionCleanup cleanup : cleanups) {
                            List<String> oldBuckets = cleanup.oldBuckets.get();
                            if (oldBuckets != null && !oldBuckets.isEmpty()) {
                                cleanupPipeline.hdel(
                                        cleanup.key,
                                        oldBuckets.toArray(new String[0])
                                );
                            }
                        }
                        cleanupPipeline.sync();
                    }
                    buffer.clear();
                    return;
                } catch (Exception e) {
                    attempt++;
                    LOG.warn("Redis sink flush failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                    if (attempt >= MAX_RETRIES) {
                        LOG.error("Redis sink flush failed after {} attempts", MAX_RETRIES, e);
                        throw new IOException("Redis sink flush failed", e);
                    }
                    LOG.info("Retrying Redis sink flush after backoff (attempt {}/{})", attempt, MAX_RETRIES);
                    resetConnection();
                    sleepBackoff();
                }
            }
        }

        private void ensureConnected() throws IOException, InterruptedException {
            if (jedis == null || !jedis.isConnected()) {
                resetConnection();
            }
        }

        private void resetConnection() throws IOException, InterruptedException {
            if (jedis != null) {
                try {
                    jedis.close();
                } catch (Exception e) {
                    LOG.warn("Failed to close Redis connection: {}", e.getMessage());
                }
            }
            jedis = connectWithRetry();
        }

        private Jedis connectWithRetry() throws IOException, InterruptedException {
            int attempt = 0;
            while (true) {
                try {
                    Jedis client = new Jedis(redisHostPort);
                    client.ping();
                    return client;
                } catch (Exception e) {
                    attempt++;
                    LOG.warn("Redis connection failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                    if (attempt >= MAX_RETRIES) {
                        LOG.error("Redis connection failed after {} attempts", MAX_RETRIES, e);
                        throw new IOException("Redis connection failed", e);
                    }
                    sleepBackoff();
                }
            }
        }

        private void sleepBackoff() throws InterruptedException {
            Thread.sleep(RETRY_BACKOFF_MILLIS);
        }

        private class RetentionCleanup {
            private final String key;
            private final Response<List<String>> oldBuckets;

            private RetentionCleanup(String key, Response<List<String>> oldBuckets) {
                this.key = key;
                this.oldBuckets = oldBuckets;
            }
        }
    }
}
