// SupersetPluginTableSheet.jsx
import React, {useEffect, useRef} from 'react';
import {PivotSheet} from '@antv/s2';
import {SupersetPluginChartAntvPivotProps} from "./types";


export default function SupersetPluginChartLiquid(props: SupersetPluginChartAntvPivotProps) {
    const {
        width,
        height,
        fields,
        meta,
        data,
        groupbyRows,
        groupbyColumns,
        rowTotals,
        rowSubTotals,
        colTotals,
        colSubTotals,
        totalData,
        rowTotalsRename,
        colTotalsRename
    } = props;


    const containerRef = useRef(null);

    useEffect(() => {
        const fetchDataAndRenderSheet = async () => {
            try {
                const s2DataConfig = {
                    fields: fields,
                    meta: meta,
                    data,
                    totalData: totalData
                };

                const s2Options = {
                    width: width,
                    height: height,
                    // 冻结行头
                    // frozenRowHeader: true
                    // 配置小计总计显示
                    totals: {
                        row: {
                            showGrandTotals: rowTotals,
                            showSubTotals: rowSubTotals,
                            reverseLayout: false,
                            reverseSubLayout: false,
                            subTotalsDimensions: groupbyRows,
                            label: rowTotalsRename,
                        },
                        col: {
                            showGrandTotals: colTotals,
                            showSubTotals: colSubTotals,
                            reverseLayout: false,
                            reverseSubLayout: false,
                            subTotalsDimensions: groupbyColumns,
                            label: colTotalsRename,
                        },
                    },
                };

                // Clear existing content in the container
                const container = containerRef.current;
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                const s2 = new PivotSheet(containerRef.current, s2DataConfig, s2Options);
                s2.render();
            } catch (error) {
                console.error('Error fetching data or rendering TableSheet:', error);
            }
        };

        fetchDataAndRenderSheet();
        return () => {
            const container = containerRef.current;
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        };
    }, [
        width,
        height,
        fields,
        meta,
        data,
        groupbyRows,
        groupbyColumns,
        rowTotals,
        rowSubTotals,
        colTotals,
        colSubTotals
    ]);

    return <div ref={containerRef}/>;
}
