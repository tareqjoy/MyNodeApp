package analytics.model.likeunlike;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

@Data
@NoArgsConstructor(force = true)
@AllArgsConstructor
public class PostLikeCount {
    private final String postId;
    private final long likeCount;
}
