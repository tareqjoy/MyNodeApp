package analytics.model.likeunlike;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LikeBucketCount {
    private String segment;
    private String postId;
    private long bucketTs;
    private long count;
}
