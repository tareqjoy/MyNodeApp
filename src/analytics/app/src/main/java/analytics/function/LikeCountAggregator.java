package analytics.function;

import analytics.model.likeunlike.LikeUnlikeKafkaMsg;
import org.apache.flink.api.common.functions.AggregateFunction;

public class LikeCountAggregator implements AggregateFunction<LikeUnlikeKafkaMsg, Long, Long> {
    @Override
    public Long createAccumulator() { return 0L; }

    @Override
    public Long add(LikeUnlikeKafkaMsg value, Long accumulator) { return accumulator + 1; }

    @Override
    public Long getResult(Long accumulator) { return accumulator; }

    @Override
    public Long merge(Long a, Long b) { return a + b; }
}
