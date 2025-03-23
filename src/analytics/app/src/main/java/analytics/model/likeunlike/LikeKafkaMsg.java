package analytics.model.likeunlike;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class LikeKafkaMsg extends LikeUnlikeKafkaMsg {
    @NonNull
    private String userId;
    @NonNull
    private LikeReq messageObject; // Can be LikeReq or UnlikeReq
}
