package analytics.model.likeunlike;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true) // Ignore unrecognized fields
@Data
@NoArgsConstructor
public class UnlikeKafkaMsg extends LikeUnlikeKafkaMsg {
    private String userId;

    private UnlikeReq messageObject; // Can be LikeReq or UnlikeReq

}
