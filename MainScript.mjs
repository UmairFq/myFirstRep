export function CompanyQuery(type){   
     var query = `
            DECLARE @Count INT =1;
            DECLARE @Dbname VARCHAR(MAX) = '';
            DECLARE @Query VARCHAR(MAX) = '';
            DECLARE @type Varchar(50) = '{0}'

            IF OBJECT_ID('tempdb..#TempCompany') IS NOT NULL DROP TAbLE #TempCompany
            IF OBJECT_ID('tempdb..#FilteredCompany') IS NOT NULL DROP TAbLE #FilteredCompany

            CREATE TABLE #TempCompany (id INT IDENTITY(1,1),companyID INT, companyName VARCHAR(MAX), DBName VARCHAR(MAX),ClientType VARCHAR(MAX))
            CREATE TABLE #FilteredCompany (companyID INT, companyName VARCHAR(MAX), DBName VARCHAR(MAX),ClientType VARCHAR(MAX))
            IF(@type != 'ATI' )
                BEGIN
                    INSERT INTO #TempCompany
                    SELECT * FROM CentralHub.dbo.Company_clientType
                    Where ClientType = @type AND (DBname IS NOT NULL) AND DBName NOT IN ('BLJWirelessInc','RXPWireless','NRSWireless','Amcomm','CCCommunications', 'russellcellular','TheCellularConnection','IMWireless','JHCellular')
                END
            ELSE
                BEGIN
               
                INSERT INTO #TempCompany
                SELECT companyID,companyName,DBName,'ATI' FROM ATI.dbo.ATICompanies
                JOIN Master.sys.databases m on m.name = DBName
                WHERE m.state !=6; 
                END

                WHILE(@Count<=(SELECT Count(id) From #TempCompany))
                    BEGIN
                        SET @Dbname = (SELECT DBName FROM #TempCompany WHERE id = @Count);
                        SET @Query = '
                                        USE '+@Dbname+' 
                                        IF (OBJECT_ID(''ShiftlabPHI_Flatten'', ''U'') IS NOT NULL )
                                        BEGIN
                                        INSERT INTO #FilteredCompany (companyID, companyName, DbName, ClientType)
                                        SELECT companyID, companyName, DbName, ClientType FROM #TempCompany WHERE dbname = '''+@Dbname+'''
                                        END
                                    '
                        Exec  (@Query);
                        SET @Count = @Count+1; 
                    END
                SELECT * FROM #FilteredCompany`.replace('{0}',type);

                return query;
}
export function BtnAudit(selectedFiles,reader,txt,TotalData) {
    if (typeof selectedFiles === 'undefined') {
        alert('no files Selected yet');
    } else {
        var type = $('#ClientType').val();
        var dbname = $('#company').val();
        if (type != 'NUll' && dbname != 'NUll' && dbname != '-1') {
            $('#loader').show();
            var dbData = new Array();
            $.ajax({
                url: 'http://74.214.18.24/api/DBOL/Query/',
                 method: 'post',
           data: {
                 server: 'SERVER48',
                 query : Query(type,dbname)
                 },
                 type: 'json',               
                success: function (data) {
                    txt = reader.result;
                    dbData = data.Table;
                    for(var i=0; i<dbData.length; i++) { 
                        dbData[i].Traffic = dbData[i].Traffic.toString();
                        dbData[i].Boxes = dbData[i].Boxes.toString();
                        }
                    TotalData = data.Table1;
                    var arr2 = new Array();
                    arr2 = csvToArray(txt, ';');
                    arr2 = _.sortBy(arr2, 'SalesPersonName','StoreName');
                    arr2 = JSON.stringify(arr2).replaceAll('\\r', '');
                    var ob = JSON.parse(arr2);
                    var traffic = 0, monitored = 0, unmonitored = 0;
                    if (ob.length == dbData.length) {
                        for (var row = 0; row < ob.length; row++) {

                            let d = new Date(dbData[row]["CreatedDate"]);
                            dbData[row]["CreatedDate"] = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

                            traffic += parseInt(ob[row]["Traffic"]);
                            if (ob[row]["Status"] == "Monitored") {
                                monitored += parseInt(ob[row]["Boxes"]);
                            }
                            else {
                                unmonitored += parseInt(ob[row]["Boxes"]);
                            }
                        }
                    } else {
                        for (var row = 0; row < dbData.length; row++) {
                            let d = new Date(dbData[row]["CreatedDate"]);
                            dbData[row]["CreatedDate"] = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
                        }
                        for (var row = 0; row < ob.length; row++) {
                            traffic += parseInt(ob[row]["Traffic"]);
                            if (ob[row]["Status"] == "Monitored") {
                                monitored += parseInt(ob[row]["Boxes"]);
                            }
                            else {
                                unmonitored += parseInt(ob[row]["Boxes"]);
                            }
                        }
                    }
                    var str = '';
                    dbData = _.sortBy(dbData, 'SalesPersonName','StoreName');
                    var data1 = JSON.stringify(dbData);
                    var difference = data1.length - arr2.length;
                    if (difference <= 500 && difference >= -500) {
                        if (_.isEqual(data1, arr2)) {
                            $('#dbTraffic').text(TotalData[0].Traffic);
                            $('#DbMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                            (TotalData[0].UnmonitoredBoxes) != null ? $('#DbUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#DbUnmonitoredBoxes').text(0);

                            $('#queryTraffic').text(TotalData[0].Traffic);
                            $('#queryMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                            (TotalData[0].UnmonitoredBoxes) != null ? $('#queryUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#queryUnmonitoredBoxes').text(0);
                            $('#FileTraffic').text(traffic);
                            $('#FileMonitoredBoxes').text(monitored);
                            $('#FileUnmonitoredBoxes').text(unmonitored);
                            $('#lblresult').css("color", 'Green');
                            $('#lblresult').text("Success!!! Completey Matched");
                            $('#mainDiv').attr('hidden', 'true');
                            $('#loader').hide();
                            $("#resultModal").modal();
                        }
                        else {
                            var jsonObject1 = JSON.parse(data1);
                            var jsonObject2 = JSON.parse(arr2);

                            var keys = Object.keys(jsonObject1);

                            for (var i = 0; i < keys.length; i++) {

                                var key = keys[i];

                               if (!_.isEqual(jsonObject1[key], jsonObject2[key])) {
                                   var k = Object.keys(jsonObject1[key]);
                                  
                                   $('#MissingTable').empty();
                                   $('#MissingTable').append('<thead><tr><th>Column</th><th>File Value</th><th>DB Value</th></tr></thead>');
                                   for (var j = 0; j < k.length; j++) {
                                       var val1 = Object.values(jsonObject1[key]);
                                       var val2 = Object.values(jsonObject2[key]);
                                       if (!_.isEqual(val1[j], val2[j]))
                                       {
                                           str += ("<tr> <td>" + k[j] + "</td><td>" + val2[j] + "</td><td>" + val1[j] + "</td></tr>");
                                       }
                                   }
                                   
                               }
                            }
                            $('#mainDiv').removeAttr('hidden', 'false');
                            $('#MissingTable').append(str);

                            $('#dbTraffic').text(TotalData[0].Traffic);
                            $('#DbMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                            (TotalData[0].UnmonitoredBoxes) != null ? $('#DbUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#DbUnmonitoredBoxes').text(0);

                            $('#queryTraffic').text(TotalData[0].Traffic);
                            $('#queryMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                            (TotalData[0].UnmonitoredBoxes) != null ? $('#queryUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#queryUnmonitoredBoxes').text(0);
                            $('#FileTraffic').text(traffic);
                            $('#FileMonitoredBoxes').text(monitored);
                            $('#FileUnmonitoredBoxes').text(unmonitored);
                            $('#lblresult').css("color", 'Red');
                            $('#lblresult').text("Failed!!! Still Some Data Is Mismatched");
                            $('#loader').hide();
                            $("#resultModal").modal();
                        }
                    }
                    else {
                        $('#dbTraffic').text(TotalData[0].Traffic);
                        $('#DbMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                        (TotalData[0].UnmonitoredBoxes) != null ? $('#DbUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#DbUnmonitoredBoxes').text(0);
                        $('#queryTraffic').text(TotalData[0].Traffic);
                        $('#queryMonitoredBoxes').text(TotalData[0].Monitored_boxes);
                        (TotalData[0].UnmonitoredBoxes) != null ? $('#queryUnmonitoredBoxes').text(TotalData[0].UnmonitoredBoxes) : $('#queryUnmonitoredBoxes').text(0);
                        $('#FileTraffic').text(traffic);
                        $('#FileMonitoredBoxes').text(monitored);
                        $('#FileUnmonitoredBoxes').text(unmonitored);
                        $('#lblresult').css("color", 'Red');
                        $('#mainDiv').attr('hidden', 'true');
                        $('#lblresult').text("Failed!!! Still Some Data Is Mismatched");
                        $('#loader').hide();
                        $("#resultModal").modal();
                    }
                }
            });
        } else {
            alert("Please Select Company or Company Type!")
        }
    }
}
function csvToArray(str, delimiter) {
    var header_cols = str.slice(0, str.indexOf("\n")).split(delimiter);
    var row_data = str.slice(str.indexOf("\n") + 1).split("\n");
    var arr = row_data.map(function (row) {
        var values = row.split(delimiter);
        var el;
        if (values != undefined) {
            el = header_cols.reduce(function (object, header, index) {
                object[header] = values[index];
                return object;
            }, {});
        }
        return el;
    });
    arr.pop();

    return arr;
}
export function Query(type,dbname)
{
    if (type == "ATI")
    {
        var query = `USE {0}
        DECLARE @ClientMinus_One_or_Two int = 2;

                IF OBJECT_ID ('tempdb..#CMSDates') IS NOT NULL DROP TABLE #CMSDates
                IF OBJECT_ID ('tempdb..#SalesTemp') IS NOT NULL DROP TABLE #SalesTemp
                IF OBJECT_ID ('tempdb..#traffictemp1') IS NOT NULL DROP TABLE #traffictemp1
                IF OBJECT_ID ('tempdb..#traffictemp2') IS NOT NULL DROP TABLE #traffictemp2
                IF OBJECT_ID ('tempdb..#trafficfinal') IS NOT NULL DROP TABLE #trafficfinal
                IF OBJECT_ID ('tempdb..#FinalPHI') IS NOT NULL DROP TABLE #FinalPHI
                IF OBJECT_ID ('tempdb..#ShiftlabPHI_Flatten') IS NOT NULL DROP TABLE #ShiftlabPHI_Flatten

                SELECT 
	                CreatedDate,
	                StoreID 
                INTO #ShiftlabPHI_Flatten 
                FROM (
	                SELECT DISTINCT 
		                CAST(CreatedDate AS DATE) AS CreatedDate,
		                StoreID as StoreID 
	                FROM ShiftlabPHI_Flatten
	                WHERE	
		                CAST(SyncDate AS DATE) = CAST(GETDATE() AS DATE)
		                AND CAST(CreatedDate AS DATE) <= CAST(GETDATE() - @ClientMinus_One_or_Two AS DATE)
	                UNION
	                SELECT DISTINCT 
		                CAST(CreatedDate AS DATE) AS CreatedDate, 
		                StoreID 
	                FROM ShiftlabPHI_Flatten
	                WHERE 
		                CAST(syncdate AS DATE) = CAST(GETDATE()-1 AS DATE)
		                AND CAST(CreatedDate AS DATE) = CAST(GETDATE()-2 AS DATE)
                ) AS Tbl


                SELECT DISTINCT 
	                MonitoringForDate, 
	                StoreID 
                INTO #CMSDates 
                FROM StoreMonitoring
                WHERE 
	                CAST(ProcessForConvDate AS DATE) = CAST(GETDATE() AS DATE) AND CAST(MonitoringForDate AS DATE) <= CAST(GETDATE()-2 AS DATE)
	                AND MonitoringStatusID = 220
                UNION
                SELECT DISTINCT 
	                MonitoringForDate, 
	                StoreID 
                FROM StoreMonitoring
                WHERE
	                CAST(ProcessForConvDate AS DATE) = CAST(GETDATE()-1 AS DATE) AND cast(MonitoringForDate AS DATE) = cast(Getdate()-2 AS DATE)
	                AND MonitoringStatusID = 220
                UNION
                SELECT DISTINCT 
	                Cast(CreatedDate AS DATE) AS CreatedDate,
	                StoreID
                FROM #ShiftlabPHI_Flatten
                --------------------


                -------------------------- Collect Sales from RQSalesFlatten --------------------

                IF OBJECT_ID ('tempdb..#SalesTemp') IS NOT NULL DROP TABLE #SalesTemp
                if OBJECT_ID ('tempdb..#Paw_Data') is not null drop table #Paw_Data
                select
	                paw.TermID,
	                paw.TermType,
	                paw.PriceSheetID,
	                paw.SaleInvoiceID,
	                RatePlanRebateGlobalProductID
                into #Paw_Data
                from iQclerk_SaleInvoicesAndPAW_Data as paw 
	                inner join iQclerk_PriceSheetsAndTerms as ps 
		                on ps.termID = paw.termID 
		                   and ps.termType = paw.termtype
		                   and ps.pricesheetid = paw.pricesheetid 
		                   and ps.termType <> 5
                option (recompile);

                --select top 1 * from rqsalesflatten
                SELECT 
	                RQDate,
	                CAST(DATEADD(MINUTE,(DATEDIFF(MINUTE,0,datetimecreated)/60)*60,0) AS TIME) AS HOUR,
	                s.StoreName AS StoreName,
	                s.StoreID AS RebizStoreID,
	                ei.UserName AS SalesPersonName,
	                ei.EmployeeID AS RebizEmployeeID,
	                SUM(RQQty) AS Boxes
                INTO #SalesTemp
                FROM RQSalesFlatten rq
                inner join (
			                select distinct RatePlanRebateGlobalProductID 
			                from #Paw_Data
			                ) as tbl 
			                on tbl.RatePlanRebateGlobalProductID = rq.rqglobalproductid
	                INNER JOIN Centralhub.dbo.BasecampRQ_StoreMapping sm ON rq.RQStoreID = sm.RIQStoreID
	                INNER JOIN Store s ON s.StoreID = sm.StoreId
	                INNER JOIN BasecampRq_EmployeeMapping em ON em.RIQEmpId = rq.RQRepID
	                INNER JOIN EmployeeInformation ei ON ei.EmployeeID = em.BasecampEmpId
                WHERE
	                 RQDate IN (SELECT MonitoringForDate FROM #CMSDates WHERE storeid = s.StoreID)
	                 AND CONVERT(DATETIME, CONVERT(VARCHAR(10), RQDate,101)) >= s.StartMonitoringDate
	                 and rqRepID in (
		                select distinct RIQEmpId 
		                from BasecampRq_EmployeeMapping 
		                where RIQEmpId is not null
		                )
	                and rqstoreID in (
		                select distinct RIQStoreId 
		                from centralhub.dbo.BasecampRQ_StoreMapping 
		                where 
			                 RIQStoreId is not null 
			                and storeid in (
				                select storeid 
				                from (
					                select * from store 
					                where 
						                startmonitoringdate is not null 
						                and isMonitoringAvailable = 1 
						                and terminationdate is null 
						                and active=1
						                and Convert(datetime, Convert(varchar(10),rqdate,101))>= startmonitoringdate 
					                union all 
					                select * from store 
					                where 
						                (terminationdate is null) 
						                and Convert(datetime, Convert(varchar(10),rqdate,101))>= startmonitoringdate 
						                and (startmonitoringdate is not null)
					                ) a
				                )
		                ) 
		
                --option (recompile);
	                -- AND CONVERT(DATETIME, CONVERT(VARCHAR(10), RQDate,101)) <= ISNULL(s.TerminationDate,CONVERT(DATE,GETDATE()))
	                -- AND RQProductSKU IN (SELECT DISTINCT ProductSKUID FROM CategorySKU)
                GROUP BY
	                RQDate,
	                DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, datetimecreated) / 60) * 60, 0),
	                s.StoreName,
	                ei.UserName,
	                ei.EmployeeID,
	                s.StoreID
	
	
	
	                --SELECT * from #SalesTemp
	                --SELECT top 100 * from #Paw_Data
	                --SELECT * from #ShiftlabPHI_Flatten

	                -------------------------------- Traffic hour making query on in time ----------------------

                SELECT
                sm.StoreID,
                sg.GroupCustomerID,
                sg.MaxEmployeeID,
                ec.TimeFrame,
                CAST(DATEADD (MINUTE, (DATEDIFF(MINUTE, 0, TimeFrame) / 60) * 60, 0) AS TIME) AS [HOUR],
                ec.IsReEnter
                INTO #traffictemp1
                FROM EmployeeCustomer ec
                INNER JOIN StoreGroupCustomer sg ON sg.GroupCustomerID = ec.GroupCustomerID
                INNER JOIN StoreMonitoring sm ON sm.StoreMonitoringID = sg.StoreMonitoringID
                INNER JOIN Store ss ON ss.StoreID = sm.StoreID
                WHERE
                CAST(MonitoringForDate AS DATE) IN (SELECT MonitoringForDate FROM #CMSDates WHERE StoreID = ss.StoreID)
                AND ec.[Action] = 'in'
                AND ec.IsReEnter = 0
                AND MonitoringStatusID = 220
                GROUP BY
                sm.StoreID,
                sg.GroupCustomerID,
                sg.MaxEmployeeID,
                TimeFrame,
                DATEPART(HH,ec.TimeFrame),
                ec.IsReEnter
                ORDER BY 3

                -------------------------------- Count Traffic query on max time level ----------------------

                SELECT
                sm.MonitoringForDate,
                ec.StoreID,
                ec.GroupCustomerID,
                sg.MaxEmployeeID,
                em.UserName,
                ec.[HOUR],
                SUM(sg.CustomerCount) AS Traffic
                INTO #traffictemp2
                FROM #traffictemp1 ec
                INNER JOIN EmployeeCustomer ecc ON ecc.GroupCustomerID = ec.GroupCustomerID
                INNER JOIN StoreGroupCustomer sg ON sg.GroupCustomerID = ec.GroupCustomerID
                INNER JOIN StoreMonitoring sm ON sm.StoreMonitoringID = sg.StoreMonitoringID
                LEFT OUTER JOIN EmployeeInformation em ON em.EmployeeID = sg.MaxEmployeeID
                INNER JOIN Store ss ON ss.StoreID = sm.StoreID
                WHERE CAST(MonitoringForDate AS DATE) IN (SELECT MonitoringForDate FROM #CMSDates WHERE StoreID = ss.StoreID)
                ANd ecc.[Action] = 'out'
                AND ecc.IsReEnter = 0
                AND MonitoringStatusID = 220
                group by
                sm.MonitoringForDate,
                ec.StoreID,
                ec.GroupCustomerID,
                sg.MaxEmployeeID,
                em.UserName,
                ec.[Hour]
                order by 5


                SELECT
                t.MonitoringForDate,
                t.[Hour],
                s.StoreName,
                t.StoreID,
                t.MaxEmployeeID,
                t.UserName,
                SUM(Traffic) AS Traffic  
                INTO #trafficfinal FROM #traffictemp2 t
                INNER JOIN Store s ON s.storeID = t.StoreID
                LEFT OUTER JOIN EmployeeInformation em ON em.EmployeeID = t.MaxEmployeeID
                GROUP BY
                t.MonitoringForDate,
                t.[Hour],
                s.StoreName,
                t.StoreID,
                t.MaxEmployeeID,
                t.UserName

                UPDATE #trafficfinal SET MaxEmployeeID = 0 WHERE UserName LIKE 'UNKN-%'
                UPDATE #trafficfinal SET MaxEmployeeID = -99999 WHERE UserName IN (SELECT UserName FROM EmployeeInformation WHERE GroupID > 0 AND GroupID < 9)
                UPDATE #trafficfinal SET MaxEmployeeID = -1 WHERE UserName IS NULL
                UPDATE #trafficfinal SET UserName = 'Unattended' WHERE MaxEmployeeID = -1

                ------------------ End Traffic query on hour level -------------------------

                ------------------ Start final query for Traffic and Sales --------------

                ------------------------- Query for aggregated data of Sales and Traffic ---------------------
                DECLARE @minDate DATE    
                SELECT @minDate = MIN(CAST(MonitoringForDate AS DATE)) FROM #CMSDates
 
                SELECT
                CAST(DateCreated AS DATE) AS DateCreated,
                CreatedHour AS CreatedHour,
                StoreName as StoreName,
                RebizStoreID,
                SalesPersonName as SalesPersonName,
                RebizEmployeeId,
                SUM(traffic) AS Traffic,
                SUM(boxes) AS Boxes,
                CASE WHEN mu.MonitoringForDate IS NOT NULL THEN 'Monitored' ELSE  'Unmonitored' END AS [Status]
                INTO #FinalPHI
                FROM (
                SELECT
                DateCreated,
                SalesHour AS CreatedHour,
                SalesStoreName AS StoreName,
                RebizStoreId,
                SalesPerName AS SalesPersonName,
                RebizEmployeeId,
                SUM(boxes) AS Boxes,
                SUM(traffic) AS Traffic
                FROM (
                SELECT
                RQDate AS DateCreated,
                CAST(DATEADD (MINUTE, (DATEDIFF (MINUTE, 0, s.[Hour]) / 60) * 60, 0) AS TIME) AS SalesHour,
                s.StoreName AS SalesStoreName,
                s.RebizStoreID AS RebizStoreId,
                s.SalesPersonName AS SalesPerName,
                s.RebizEmployeeID AS RebizEmployeeID,
                s.Boxes AS Boxes,
                0 AS Traffic
                FROM #SalesTemp s
                UNION
                SELECT
                t.MonitoringForDate AS MonitoringForDate,
                CAST(DATEADD (MINUTE, (DATEDIFF (MINUTE, 0, t.[Hour]) / 60) * 60, 0) AS TIME) AS Traffichour,
                t.StoreName AS TrafficStoreName,
                t.StoreID AS StoreID,
                t.UserName AS TrafficPerName,
                t.MaxEmployeeID AS Employee,
                0 AS Boxes,
                t.Traffic AS Traffic
                FROM #trafficfinal t
                ) AS tbl
                GROUP BY
                DateCreated,
                SalesHour,
                SalesStoreName,
                RebizStoreId,
                SalesPerName,
                RebizEmployeeId
                ) AS tbl2
                LEFT JOIN (
                SELECT DISTINCT
                StoreID,
                MonitoringForDate
                FROM StoreMonitoring
                where
                MonitoringStatusID  = 220
                and MonitoringForDate >= @minDate
                ) AS mu
                ON CAST(mu.MonitoringForDate AS DATE) = CAST(tbl2.DateCreated AS DATE)
                AND mu.StoreID = tbl2.RebizStoreID
                GROUP BY
                DateCreated,
                CreatedHour,
                StoreName,
                RebizStoreID,
                SalesPersonName,
                RebizEmployeeId,
                mu.MonitoringForDate

                SELECT
                CONVERT(VARCHAR, DateCreated, 101) as CreatedDate,
                CONVERT(VARCHAR, CONVERT(VARCHAR, CreatedHour,108)) as CreatedHour,
                StoreName,
                SalesPersonName,
                Traffic,
                Boxes,
                [Status]
                FROM #FinalPHI
                ORDER BY 1,2,6,3 DESC

                SELECT
                SUM(Traffic) AS Traffic,
                SUM(Boxes) AS Monitored_boxes,
                (SELECT SUM(Boxes) AS UnmonitoredBoxes FROM #FinalPHI WHERE [Status] = 'unmonitored') AS UnmonitoredBoxes  
                FROM #FinalPHI
                WHERE [Status] = 'monitored'

                DROP TABLE #CMSDates
                DROP TABLE #SalesTemp
                DROP TABLE #traffictemp1
                DROP TABLE #traffictemp2
                DROP TABLE #trafficfinal
                DROP TABLE #FinalPHI
                DROP TABLE #ShiftlabPHI_Flatten
        `.replace('{0}',dbname);
    }
    else if(type=="RQDC")
    {
        var query = `
                    USE {0}
                    DECLARE @ClientMinus_One_or_Two int = 2;

                    IF OBJECT_ID ('tempdb..#CMSDates') IS NOT NULL DROP TABLE #CMSDates
                    IF OBJECT_ID ('tempdb..#SalesTemp') IS NOT NULL DROP TABLE #SalesTemp
                    IF OBJECT_ID ('tempdb..#traffictemp1') IS NOT NULL DROP TABLE #traffictemp1
                    IF OBJECT_ID ('tempdb..#traffictemp2') IS NOT NULL DROP TABLE #traffictemp2
                    IF OBJECT_ID ('tempdb..#trafficfinal') IS NOT NULL DROP TABLE #trafficfinal
                    IF OBJECT_ID ('tempdb..#FinalPHI') IS NOT NULL DROP TABLE #FinalPHI
                    IF OBJECT_ID ('tempdb..#ShiftlabPHI_Flatten') IS NOT NULL DROP TABLE #ShiftlabPHI_Flatten

                    SELECT
                    CreatedDate,
                    StoreID
                    INTO #ShiftlabPHI_Flatten
                    FROM (
                    SELECT DISTINCT
                    CAST(CreatedDate AS DATE) AS CreatedDate,
                    StoreID as StoreID
                    FROM ShiftlabPHI_Flatten
                    WHERE
                    CAST(SyncDate AS DATE) = CAST(GETDATE() AS DATE)
                    AND CAST(CreatedDate AS DATE) <= CAST(GETDATE() - @ClientMinus_One_or_Two AS DATE)
                    UNION
                    SELECT DISTINCT
                    CAST(CreatedDate AS DATE) AS CreatedDate,
                    StoreID
                    FROM ShiftlabPHI_Flatten
                    WHERE
                    CAST(SyncDate AS DATE) = CAST(GETDATE()-1 AS DATE)
                    AND CAST(CreatedDate AS DATE) = CAST(GETDATE()-2 AS DATE)
                    ) AS Tbl


                    SELECT DISTINCT
                    MonitoringForDate,
                    StoreID
                    INTO #CMSDates
                    FROM StoreMonitoring
                    WHERE
                    CAST(ProcessForConvDate AS DATE) = CAST(GETDATE() AS DATE) AND CAST(MonitoringForDate AS DATE) <= CAST(GETDATE()-2 AS DATE)
                    AND MonitoringStatusID = 220
                    UNION
                    SELECT DISTINCT
                    MonitoringForDate,
                    StoreID
                    FROM StoreMonitoring
                    WHERE
                    CAST(ProcessForConvDate AS DATE) = CAST(GETDATE()-1 AS DATE) AND cast(MonitoringForDate AS DATE) = cast(Getdate()-2 AS DATE)
                    AND MonitoringStatusID = 220
                    UNION
                    SELECT DISTINCT
                    Cast(CreatedDate AS DATE) AS CreatedDate,
                    StoreID
                    FROM #ShiftlabPHI_Flatten
                    --------------------


                    -------------------------- Collect Sales from RQSalesFlatten --------------------

                    IF OBJECT_ID ('tempdb..#SalesTemp') IS NOT NULL DROP TABLE #SalesTemp
                    SELECT
                    RQDate,
                    CAST(DATEADD(MINUTE,(DATEDIFF(MINUTE,0,datetimecreated)/60)*60,0) AS TIME) AS HOUR,
                    s.StoreName AS StoreName,
                    s.StoreID AS RebizStoreID,
                    ei.UserName AS SalesPersonName,
                    ei.EmployeeID AS RebizEmployeeID,
                    SUM(RQQty) AS Boxes
                    INTO #SalesTemp
                    FROM RQSalesFlatten rq
                    INNER JOIN Centralhub.dbo.BasecampRQ_StoreMapping sm ON rq.RQStoreID = sm.RIQStoreID
                    INNER JOIN Store s ON s.StoreID = sm.StoreId
                    INNER JOIN BasecampRq_EmployeeMapping em ON em.RIQEmpId = rq.RQRepID
                    INNER JOIN EmployeeInformation ei ON ei.EmployeeID = em.BasecampEmpId
                    WHERE
                    RQDate IN (SELECT MonitoringForDate FROM #CMSDates WHERE storeid = s.StoreID)
                    AND CONVERT(DATETIME, CONVERT(VARCHAR(10), RQDate,101)) >= s.StartMonitoringDate
                    AND CONVERT(DATETIME, CONVERT(VARCHAR(10), RQDate,101)) <= ISNULL(s.TerminationDate,CONVERT(DATE,GETDATE()))
                    AND RQProductSKU IN (SELECT DISTINCT ProductSKUID FROM CategorySKU)
                    GROUP BY
                    RQDate,
                    DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, datetimecreated) / 60) * 60, 0),
                    s.StoreName,
                    ei.UserName,
                    ei.EmployeeID,
                    s.StoreID

                    --------------------------- Sales from RQSalesFlatten END  --------------------

                    -------------------------------- Traffic hour making query on in time ----------------------

                    SELECT
                    sm.StoreID,
                    sg.GroupCustomerID,
                    sg.MaxEmployeeID,
                    ec.TimeFrame,
                    CAST(DATEADD (MINUTE, (DATEDIFF(MINUTE, 0, TimeFrame) / 60) * 60, 0) AS TIME) AS [HOUR],
                    ec.IsReEnter
                    INTO #traffictemp1
                    FROM EmployeeCustomer ec
                    INNER JOIN StoreGroupCustomer sg ON sg.GroupCustomerID = ec.GroupCustomerID
                    INNER JOIN StoreMonitoring sm ON sm.StoreMonitoringID = sg.StoreMonitoringID
                    INNER JOIN Store ss ON ss.StoreID = sm.StoreID
                    WHERE
                    CAST(MonitoringForDate AS DATE) IN (SELECT MonitoringForDate FROM #CMSDates WHERE StoreID = ss.StoreID)
                    AND ec.[Action] = 'in'
                    AND ec.IsReEnter = 0
                    AND MonitoringStatusID = 220
                    GROUP BY
                    sm.StoreID,
                    sg.GroupCustomerID,
                    sg.MaxEmployeeID,
                    TimeFrame,
                    DATEPART(HH,ec.TimeFrame),
                    ec.IsReEnter
                    ORDER BY 3

                    -------------------------------- Count Traffic query on max time level ----------------------

                    SELECT
                    sm.MonitoringForDate,
                    ec.StoreID,
                    ec.GroupCustomerID,
                    sg.MaxEmployeeID,
                    em.UserName,
                    ec.[HOUR],
                    SUM(sg.CustomerCount) AS Traffic
                    INTO #traffictemp2
                    FROM #traffictemp1 ec
                    INNER JOIN EmployeeCustomer ecc ON ecc.GroupCustomerID = ec.GroupCustomerID
                    INNER JOIN StoreGroupCustomer sg ON sg.GroupCustomerID = ec.GroupCustomerID
                    INNER JOIN StoreMonitoring sm ON sm.StoreMonitoringID = sg.StoreMonitoringID
                    LEFT OUTER JOIN EmployeeInformation em ON em.EmployeeID = sg.MaxEmployeeID
                    INNER JOIN Store ss ON ss.StoreID = sm.StoreID
                    WHERE CAST(MonitoringForDate AS DATE) IN (SELECT MonitoringForDate FROM #CMSDates WHERE StoreID = ss.StoreID)
                    ANd ecc.[Action] = 'out'
                    AND ecc.IsReEnter = 0
                    AND MonitoringStatusID = 220
                    group by
                    sm.MonitoringForDate,
                    ec.StoreID,
                    ec.GroupCustomerID,
                    sg.MaxEmployeeID,
                    em.UserName,
                    ec.[Hour]
                    order by 5


                    SELECT
                    t.MonitoringForDate,
                    t.[Hour],
                    s.StoreName,
                    t.StoreID,
                    t.MaxEmployeeID,
                    t.UserName,
                    SUM(Traffic) AS Traffic  
                    INTO #trafficfinal FROM #traffictemp2 t
                    INNER JOIN Store s ON s.storeID = t.StoreID
                    LEFT OUTER JOIN EmployeeInformation em ON em.EmployeeID = t.MaxEmployeeID
                    GROUP BY
                    t.MonitoringForDate,
                    t.[Hour],
                    s.StoreName,
                    t.StoreID,
                    t.MaxEmployeeID,
                    t.UserName

                    UPDATE #trafficfinal SET MaxEmployeeID = 0 WHERE UserName LIKE 'UNKN-%'
                    UPDATE #trafficfinal SET MaxEmployeeID = -99999 WHERE UserName IN (SELECT UserName FROM EmployeeInformation WHERE GroupID > 0 AND GroupID < 9)
                    UPDATE #trafficfinal SET MaxEmployeeID = -1 WHERE UserName IS NULL
                    UPDATE #trafficfinal SET UserName = 'Unattended' WHERE MaxEmployeeID = -1

                    ------------------ End Traffic query on hour level -------------------------

                    ------------------ Start final query for Traffic and Sales --------------

                    ------------------------- Query for aggregated data of Sales and Traffic ---------------------
                    DECLARE @minDate DATE    
                    SELECT @minDate = MIN(CAST(MonitoringForDate AS DATE)) FROM #CMSDates

                    SELECT
                    CAST(DateCreated AS DATE) AS DateCreated,
                    CreatedHour AS CreatedHour,
                    StoreName as StoreName,
                    RebizStoreID,
                    SalesPersonName as SalesPersonName,
                    RebizEmployeeId,
                    SUM(traffic) AS Traffic,
                    SUM(boxes) AS Boxes,
                    CASE WHEN mu.MonitoringForDate IS NOT NULL THEN 'Monitored' ELSE  'Unmonitored' END AS [Status]
                    INTO #FinalPHI
                    FROM (
                    SELECT
                    DateCreated,
                    SalesHour AS CreatedHour,
                    SalesStoreName AS StoreName,
                    RebizStoreId,
                    SalesPerName AS SalesPersonName,
                    RebizEmployeeId,
                    SUM(boxes) AS Boxes,
                    SUM(traffic) AS Traffic
                    FROM (
                    SELECT
                    RQDate AS DateCreated,
                    CAST(DATEADD (MINUTE, (DATEDIFF (MINUTE, 0, s.[Hour]) / 60) * 60, 0) AS TIME) AS SalesHour,
                    s.StoreName AS SalesStoreName,
                    s.RebizStoreID AS RebizStoreId,
                    s.SalesPersonName AS SalesPerName,
                    s.RebizEmployeeID AS RebizEmployeeID,
                    s.Boxes AS Boxes,
                    0 AS Traffic
                    FROM #SalesTemp s
                    UNION
                    SELECT
                    t.MonitoringForDate AS MonitoringForDate,
                    CAST(DATEADD (MINUTE, (DATEDIFF (MINUTE, 0, t.[Hour]) / 60) * 60, 0) AS TIME) AS Traffichour,
                    t.StoreName AS TrafficStoreName,
                    t.StoreID AS StoreID,
                    t.UserName AS TrafficPerName,
                    t.MaxEmployeeID AS Employee,
                    0 AS Boxes,
                    t.Traffic AS Traffic
                    FROM #trafficfinal t
                    ) AS tbl
                    GROUP BY
                    DateCreated,
                    SalesHour,
                    SalesStoreName,
                    RebizStoreId,
                    SalesPerName,
                    RebizEmployeeId
                    ) AS tbl2
                    LEFT JOIN (
                    SELECT DISTINCT
                    StoreID,
                    MonitoringForDate
                    FROM StoreMonitoring
                    where
                    MonitoringStatusID  = 220
                    and MonitoringForDate >= @minDate
                    ) AS mu
                    ON CAST(mu.MonitoringForDate AS DATE) = CAST(tbl2.DateCreated AS DATE)
                    AND mu.StoreID = tbl2.RebizStoreID
                    GROUP BY
                    DateCreated,
                    CreatedHour,
                    StoreName,
                    RebizStoreID,
                    SalesPersonName,
                    RebizEmployeeId,
                    mu.MonitoringForDate

                    SELECT
                    CONVERT(VARCHAR, DateCreated, 101) as CreatedDate,
                    CONVERT(VARCHAR, CONVERT(VARCHAR, CreatedHour,108)) as CreatedHour,
                    StoreName,
                    SalesPersonName,
                    Traffic,
                    Boxes,
                    [Status]
                    FROM #FinalPHI
                    ORDER BY 1,2,6,3

                    SELECT
                    SUM(Traffic) AS Traffic,
                    SUM(Boxes) AS Monitored_boxes,
                    (SELECT SUM(Boxes) AS UnmonitoredBoxes FROM #FinalPHI WHERE [Status] = 'unmonitored') AS UnmonitoredBoxes  
                    FROM #FinalPHI
                    WHERE [Status] = 'monitored'

                    update #FinalPHI set StoreName = 'Weston & Lawrence' where StoreName like '%Weston Lawrence%'
                    update #FinalPHI set StoreName = 'Center Mall at Barton' where StoreName like '%Centre Mall Barton%'

                    DROP TABLE #CMSDates
                    DROP TABLE #SalesTemp
                    DROP TABLE #traffictemp1
                    DROP TABLE #traffictemp2
                    DROP TABLE #trafficfinal
                    DROP TABLE #FinalPHI
                    DROP TABLE #ShiftlabPHI_Flatten    
           `.replace('{0}',dbname);
    }
    else
    {
       var query =`
                 Use {0} 
                 Declare @ClientMinus_One_or_Two int = 2;

                        Select CreatedDate,Storeid into #ShiftlabPHI_Flatten from (
                        Select DISTINCT Cast(CreatedDate as Date) as CreatedDate,Storeid as Storeid from ShiftlabPHI_Flatten
                        Where Cast(syncdate as Date) = Cast(Getdate() as Date)
                        and Cast(CreatedDate as Date) <= Cast(GETDATE()-@ClientMinus_One_or_Two as Date)
                        Union
                        Select DISTINCT Cast(CreatedDate as date) as CreatedDate,Storeid  from ShiftlabPHI_Flatten
                        Where Cast(syncdate as Date) = Cast(Getdate()-1 as Date)
                        and Cast(CreatedDate as Date) = Cast(GETDATE()-2 as Date)
                        ) as Tbl

                        Select DISTINCT monitoringfordate, storeID into #CMSDates from Storemonitoring
                        Where cast(Processforconvdate as Date)
                        = Cast(Getdate()as Date) and cast(Monitoringfordate as Date) <= cast(Getdate()-2 as Date)
                        and monitoringstatusid = 220
                        Union
                        Select DISTINCT monitoringfordate, storeID from Storemonitoring where cast(Processforconvdate as Date)
                        = Cast(Getdate()-1 as Date) and cast(Monitoringfordate as Date) = cast(Getdate()-2 as Date)
                        and monitoringstatusid = 220
                        Union
                        Select DISTINCT Cast(CreatedDate as Date) as CreatedDate,Storeid from #ShiftlabPHI_Flatten

                        Select cast(invoiceDate as date)as invoicedate,
                        cast(dateadd(minute,(datediff(minute,0,invoicedate)/60)*60,0) as time)as Hour,s.storeName as Storename,
                        s.storeID as RebizStoreid,em.userName as SalesersonName,
                        em.employeeID as RebizEmployeeid, sum(qty) as Boxes
                        into #SalesTemp
                        from sales_flatten r
                        inner join store s on s.storeID = r.Store
                        inner join Employeeinformation em on em.employeeID = r.employeeid
                        where cast(invoicedate as date) in (select monitoringfordate from #CMSDates where storeid = s.storeid)
                        and Convert(datetime,Convert(varchar(10),invoicedate,101))>=s.startmonitoringdate
                        and Convert(datetime, Convert(varchar(10),invoicedate,101))<=isnull(s.terminationDate,convert(date,GETDATE()))
                        and productskuid in (select distinct productskuid from categorysku) --and datepart(hh,r.DateTimeCreated) = 11
                        group by cast(invoicedate as date),dateadd(minute,(datediff(minute,0,invoicedate)/60)*60,0),
                        s.storeName,em.userName,em.employeeID,s.storeID

                     
                        Select sm.storeid,sg.groupCustomerID,sg.MaxEmployeeID,ec.timeFrame,
                        cast(dateadd(minute,(datediff(minute,0,timeframe)/60)*60,0) as time)as Hour,ec.isReEnter
                        into #traffictemp1
                        from Employeecustomer ec
                        inner join storegroupcustomer sg on sg.groupcustomerid = ec.groupcustomerid
                        inner join storemonitoring sm on sm.storemonitoringid = sg.storemonitoringid
                        inner join store ss on ss.storeid = sm.storeid
                        where cast(monitoringfordate as date) in (select monitoringfordate from #CMSDates where storeid = ss.storeid)
                        and ec.action = 'in' and ec.isReEnter = 0
                        and monitoringstatusid = 220
                        group by sm.storeid,sg.groupCustomerID,sg.MaxEmployeeID,timeFrame,DATEPART(HH,ec.timeFrame),ec.isReEnter
                        order by 3

                        Select sm.monitoringForDate,ec.storeid,ec.groupCustomerID,sg.MaxEmployeeID,em.username,ec.hour,
                        sum(sg.customerCount)as Traffic into #traffictemp2
                        from #traffictemp1 ec
                        inner join EmployeeCustomer ecc on ecc.groupCustomerID = ec.groupCustomerID
                        inner join storegroupcustomer sg on sg.groupcustomerid = ec.groupcustomerid
                        inner join storemonitoring sm on sm.storemonitoringid = sg.storemonitoringid
                        left outer join Employeeinformation em on em.employeeid = sg.maxemployeeid
                        inner join store ss on ss.storeid = sm.storeid
                        where cast(monitoringfordate as date)in (select monitoringfordate from #CMSDates where storeid = ss.storeid)
                        and ecc.action = 'out' and  ecc.isReEnter = 0
                        and monitoringstatusid = 220
                        group by sm.monitoringForDate,ec.storeid,ec.groupCustomerID,sg.MaxEmployeeID,em.username,ec.hour
                        order by 5


                        select t.monitoringForDate,t.hour,s.storeName,t.StoreId,t.maxemployeeid,t.userName,SUM(traffic)as Traffic  
                        into #trafficfinal from #traffictemp2 t
                        inner join store s on s.storeID = t.storeid
                        left outer join employeeinformation em on em.employeeid = t.maxemployeeid
                        group by t.monitoringForDate,t.hour,s.storeName,t.StoreId,t.maxemployeeid,t.userName


                        update #trafficfinal set maxemployeeid = 0 where userName like 'UNKN-%'
                        update #trafficfinal set maxemployeeid = -99999 where userName
                        in (select userName from Employeeinformation where groupid > 0 and groupID < 9)
                        update #trafficfinal set maxemployeeid = -1 where userName IS NULL
                        update #trafficfinal set userName = 'Unattended' where maxemployeeid  = -1

                        Declare @mindate date    
                          SELECT @mindate = MIN(CAST(monitoringfordate AS DATE)) FROM #CMSDates
 
                        Select  cast(datecreated as date)as datecreated,CreatedHour as CreatedHour,StoreName as StoreName,
                        RebizStoreid,SalesPersonName as SalesPersonName,RebizEmployeeid,sum(traffic) as Traffic,sum(boxes) as Boxes
                        ,CASE WHEN mu.monitoringForDate is not null THEN 'Monitored' ELSE  'Unmonitored' END AS [Status]  into #FinalPHI from (

                        select  datecreated,Saleshour as CreatedHour,SalesStorename as StoreName,RebizStoreid,Salespername as SalesPersonName,RebizEmployeeid,sum(boxes) as Boxes,sum(traffic) as Traffic from (

                        select s.invoicedate as datecreated,cast(dateadd(minute,(datediff(minute,0,s.hour)/60)*60,0)as time) as Saleshour,s.storename as SalesStorename,
                        s.RebizStoreid as RebizStoreid,s.SalesersonName as Salespername,s.RebizEmployeeid as RebizEmployeeid,s.boxes as boxes,0 as traffic
                        from #SalesTemp s
                        union
                        select  t.monitoringfordate as monitoringfordate,cast(dateadd(minute,(datediff(minute,0,t.hour)/60)*60,0)as time) as Traffichour,
                        t.storename as TrafficStorename,t.storeID as storeID,t.username as Trafficpername,t.MaxEmployeeID as Employee,0 as boxes,t.traffic as traffic from #trafficfinal t
                        ) as tbl
                        Group by datecreated,Saleshour,SalesStorename,RebizStoreid,Salespername,RebizEmployeeid
                        )
                        as tbl2
                        LEFT JOIN (SELECT DISTINCT storeID, monitoringForDate FROM Storemonitoring where
                        monitoringstatusid  = 220 and monitoringfordate >= @mindate) AS mu    
                        ON CAST(mu.monitoringForDate AS DATE) = CAST(tbl2.datecreated AS DATE)
                        AND mu.storeID = tbl2.RebizStoreid
                        group by datecreated,CreatedHour,StoreName
                        ,RebizStoreid,SalesPersonName,RebizEmployeeid,mu.monitoringForDate

                        Select CONVERT(VARCHAR,datecreated,101) as CreatedDate,CONVERT(VARCHAR,CONVERT(VARCHAR,CreatedHour,108)) as
                        CreatedHour,StoreName,SalesPersonName,Traffic,Boxes,Status from #FinalPHI
                        order by 1,2,6,3

                        Select sum(Traffic) as Traffic,sum(boxes)as Monitored_boxes,(select sum(boxes)as UnmonitoredBoxes from #FinalPHI
                        where status = 'unmonitored') as UnmonitoredBoxes  from #FinalPHI where status = 'monitored'

                        Drop Table #CMSDates
                        Drop table #SalesTemp
                        Drop table #traffictemp1
                        Drop table #traffictemp2
                        Drop table #trafficfinal
                        Drop table #FinalPHI
                        Drop table #ShiftlabPHI_Flatten
                    `.replace('{0}', dbname);
    }
    return query;
}