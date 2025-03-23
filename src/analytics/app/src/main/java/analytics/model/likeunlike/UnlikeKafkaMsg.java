package analytics.model.likeunlike;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true) // Ignore unrecognized fields
@Data
@ToString(callSuper = true)
@NoArgsConstructor
public class UnlikeKafkaMsg extends LikeUnlikeKafkaMsg {
    private UnlikeReq messageObject; // Can be LikeReq or UnlikeReq
}
