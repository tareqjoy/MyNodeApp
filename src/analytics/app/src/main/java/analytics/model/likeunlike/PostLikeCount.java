package analytics.model.likeunlike;

import lombok.Data;
import lombok.NonNull;

@Data
public class PostLikeCount {
    @NonNull
    private final String postId;
    private final long likeCount;
}
