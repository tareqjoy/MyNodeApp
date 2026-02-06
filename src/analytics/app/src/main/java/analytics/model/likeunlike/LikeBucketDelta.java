package analytics.model.likeunlike;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LikeBucketDelta {
    private String metric;
    private String segment;
    private String postId;
    private long bucketTs;
    private long delta;
}
