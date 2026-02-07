package analytics.function;

import analytics.model.likeunlike.LikeBucketDelta;
import org.apache.flink.api.common.functions.AggregateFunction;

public class LikeBucketDeltaAggregator implements AggregateFunction<LikeBucketDelta, Long, Long> {
    @Override
    public Long createAccumulator() {
        return 0L;
    }

    @Override
    public Long add(LikeBucketDelta value, Long accumulator) {
        return accumulator + value.getDelta();
    }

    @Override
    public Long getResult(Long accumulator) {
        return accumulator;
    }

    @Override
    public Long merge(Long a, Long b) {
        return a + b;
    }
}
