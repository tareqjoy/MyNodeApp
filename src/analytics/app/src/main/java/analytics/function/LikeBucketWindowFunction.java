package analytics.function;

import analytics.model.likeunlike.LikeBucketCount;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

public class LikeBucketWindowFunction
        extends ProcessWindowFunction<Long, LikeBucketCount, Tuple3<String, String, Long>, TimeWindow> {
    @Override
    public void process(
            Tuple3<String, String, Long> key,
            Context context,
            Iterable<Long> elements,
            Collector<LikeBucketCount> out
    ) {
        long count = elements.iterator().next();
        out.collect(new LikeBucketCount(key.f0, key.f1, key.f2, count));
    }
}
