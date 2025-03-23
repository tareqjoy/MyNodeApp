package analytics.model.likeunlike;


import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY,  property = "type", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = LikeKafkaMsg.class, name = "like"),
        @JsonSubTypes.Type(value = UnlikeKafkaMsg.class, name = "unlike")
})
@Data
@NoArgsConstructor
public abstract class LikeUnlikeKafkaMsg {
    @NonNull
    private String type;
    @NonNull
    private String userId;
}
