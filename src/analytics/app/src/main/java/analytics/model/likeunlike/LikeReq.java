package analytics.model.likeunlike;

import lombok.*;


@Data
@NoArgsConstructor
public class LikeReq {
    @NonNull
    private String postId;
    @NonNull
    private String reactType;
    private long reactTime;
}
