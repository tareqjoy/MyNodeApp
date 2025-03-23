package analytics.function;

import analytics.model.likeunlike.PostLikeCount;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

public class TopPostWindowFunction extends ProcessWindowFunction<Long, PostLikeCount, String, TimeWindow> {
    @Override
    public void process(String postId, Context context, Iterable<Long> elements, Collector<PostLikeCount> out) {
        long likeCount = elements.iterator().next();
        out.collect(new PostLikeCount(postId, likeCount));
    }
}
