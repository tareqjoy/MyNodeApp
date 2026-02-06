package analytics.sink;

import analytics.model.likeunlike.LikeBucketCount;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Pipeline;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class RedisBucketSink extends RichSinkFunction<LikeBucketCount> {
    private static final Logger LOG = LoggerFactory.getLogger(RedisBucketSink.class);
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_BACKOFF_MILLIS = 500L;

    private final String redisHost;
    private final int redisPort;
    private final String metric;
    private final String bucketSuffix;
    private final String changedSetKey;
    private final long retentionSeconds;
    private final long bucketSizeSeconds;
    private final int ttlSeconds;
    private final int changedSetTtlSeconds;
    private final int batchSize;

    private transient Jedis jedis;
    private transient List<LikeBucketCount> buffer;

    public RedisBucketSink(
            String redisHost,
            int redisPort,
            String metric,
            String bucketSuffix,
            String changedSetKey,
            long retentionSeconds,
            long bucketSizeSeconds,
            int ttlSeconds,
            int changedSetTtlSeconds,
            int batchSize
    ) {
        this.redisHost = redisHost;
        this.redisPort = redisPort;
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
    public void open(Configuration parameters) {
        this.jedis = connectWithRetry();
        this.buffer = new ArrayList<>(batchSize);
    }

    @Override
    public void invoke(LikeBucketCount value, Context context) {
        buffer.add(value);
        if (buffer.size() >= batchSize) {
            flush();
        }
    }

    @Override
    public void close() {
        flush();
        if (jedis != null) {
            jedis.close();
        }
    }

    private void flush() {
        if (buffer == null || buffer.isEmpty() || jedis == null) {
            return;
        }
        int attempt = 0;
        while (true) {
            try {
                ensureConnected();
                Pipeline pipeline = jedis.pipelined();
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
                    pipeline.zadd(key, record.getCount(), String.valueOf(record.getBucketTs()));
                    if (retentionSeconds > 0) {
                        pipeline.zremrangeByScore(key, "-inf", "(" + cutoff);
                    }
                    if (ttlSeconds > 0) {
                        pipeline.expire(key, ttlSeconds);
                    }
                    if (changedSetKey != null && !changedSetKey.isEmpty()) {
                        pipeline.sadd(changedSetKey, record.getPostId());
                        if (changedSetTtlSeconds > 0) {
                            pipeline.expire(changedSetKey, changedSetTtlSeconds);
                        }
                    }
                }
                pipeline.sync();
                buffer.clear();
                return;
            } catch (Exception e) {
                attempt++;
                LOG.warn("Redis sink flush failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt >= MAX_RETRIES) {
                    LOG.error("Redis sink flush failed after {} attempts", MAX_RETRIES, e);
                    throw new RuntimeException("Redis sink flush failed", e);
                }
                resetConnection();
                sleepBackoff();
            }
        }
    }

    private Jedis connectWithRetry() {
        int attempt = 0;
        while (true) {
            try {
                Jedis client = new Jedis(redisHost, redisPort);
                client.ping();
                return client;
            } catch (Exception e) {
                attempt++;
                LOG.warn("Redis connection failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt >= MAX_RETRIES) {
                    LOG.error("Redis connection failed after {} attempts", MAX_RETRIES, e);
                    throw new RuntimeException("Redis connection failed", e);
                }
                sleepBackoff();
            }
        }
    }

    private void ensureConnected() {
        if (jedis == null || !jedis.isConnected()) {
            resetConnection();
        }
    }

    private void resetConnection() {
        if (jedis != null) {
            try {
                jedis.close();
            } catch (Exception e) {
                LOG.warn("Failed to close Redis connection: {}", e.getMessage());
            }
        }
        jedis = connectWithRetry();
    }

    private void sleepBackoff() {
        try {
            Thread.sleep(RETRY_BACKOFF_MILLIS);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
