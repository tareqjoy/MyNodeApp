package analytics.model.likeunlike;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.types.DeserializationException;

import java.io.IOException;

public class PostLikeKafkaMsgDeserializationSchema implements DeserializationSchema<LikeUnlikeKafkaMsg> {
    private final ObjectMapper objectMapper;

    public PostLikeKafkaMsgDeserializationSchema() {
        this.objectMapper = new ObjectMapper();
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
    @Override
    public LikeUnlikeKafkaMsg deserialize(byte[] message) throws IOException {
        try {
            return objectMapper.readValue(message, LikeUnlikeKafkaMsg.class);
        } catch (IOException e) {
            e.printStackTrace();
            throw new DeserializationException("Error deserializing message", e);
        }
    }

    @Override
    public boolean isEndOfStream(LikeUnlikeKafkaMsg nextElement) {
        return false;
    }

    @Override
    public TypeInformation<LikeUnlikeKafkaMsg> getProducedType() {
        return TypeInformation.of(LikeUnlikeKafkaMsg.class);
    }
}
