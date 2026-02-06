package analytics.serialization;

import analytics.model.likeunlike.LikeBucketCount;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.serialization.SerializationSchema;

public class LikeBucketCountSerializationSchema implements SerializationSchema<LikeBucketCount> {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public byte[] serialize(LikeBucketCount element) {
        try {
            return MAPPER.writeValueAsBytes(element);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize LikeBucketCount", e);
        }
    }
}
