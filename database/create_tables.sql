CREATE TABLE `accesspasswords` (
  `priviledge` varchar(20) NOT NULL,
  `password` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`priviledge`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `accountbalances` (
  `company` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mode` varchar(200) DEFAULT NULL,
  `balance` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=latin1;
CREATE TABLE `activehours` (
  `logtime` varchar(20) DEFAULT NULL,
  `lastseen` varchar(20) DEFAULT NULL,
  `user` varchar(25) DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(13) DEFAULT NULL,
  `year` varchar(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `activeusers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(254) DEFAULT NULL,
  `priviledges` varchar(25) DEFAULT NULL,
  `ip` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=689 DEFAULT CHARSET=latin1;
CREATE TABLE `branches` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `company` varchar(100) DEFAULT NULL,
  `branchname` varchar(100) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  `departmenttype` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
CREATE TABLE `cashflow` (
  `company` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `netflow` float DEFAULT NULL,
  `systemtime` varchar(25) DEFAULT NULL,
  `systemdate` varchar(25) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `explanation` varchar(250) DEFAULT NULL,
  `paymentmode` varchar(254) DEFAULT NULL,
  `buyerid` varchar(50) DEFAULT NULL,
  `refno` varchar(200) NOT NULL,
  `branchname` varchar(255) NOT NULL,
  `department` varchar(100) NOT NULL,
  `partnerid` varchar(255) NOT NULL,
  `classification` varchar(255) NOT NULL,
  `MAIN_BRANCH` float DEFAULT NULL,
  `ANNEX` float DEFAULT NULL,
  `SMARTCOM` float NOT NULL,
  `KITALE_BRANCH` float NOT NULL,
  `KIPSONGO_BRANCH` float NOT NULL,
  `MainShop` float DEFAULT NULL,
  `KIPKORGOT` float DEFAULT NULL,
  `Teleview` float DEFAULT NULL,
  `Solasa` float NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `ROMA` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15825 DEFAULT CHARSET=latin1;
CREATE TABLE `cashreceipts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cashin` float DEFAULT NULL,
  `billedamount` float DEFAULT NULL,
  `changegiven` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `categories` (
  `company` varchar(255) DEFAULT NULL,
  `category` varchar(20) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company` (`company`,`category`,`department`)
) ENGINE=InnoDB AUTO_INCREMENT=427 DEFAULT CHARSET=latin1;
CREATE TABLE `consumables` (
  `test` varchar(100) NOT NULL DEFAULT '',
  `reagent` varchar(100) NOT NULL DEFAULT '',
  `qtyused` float DEFAULT NULL,
  PRIMARY KEY (`test`,`reagent`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `creditors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `unitofmeasure` varchar(50) DEFAULT NULL,
  `expirydate` varchar(25) DEFAULT NULL,
  `numofunitsbought` float DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `systemdate` varchar(20) DEFAULT NULL,
  `supplier` varchar(100) DEFAULT NULL,
  `tid` varchar(100) DEFAULT NULL,
  `receiptno` varchar(10) DEFAULT NULL,
  `costperunit` float DEFAULT NULL,
  `paid` float DEFAULT NULL,
  `bal` float DEFAULT NULL,
  `buyingprice` float DEFAULT NULL,
  `balance` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=517 DEFAULT CHARSET=latin1;
CREATE TABLE `creditpayments` (
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `accrueddebt` float DEFAULT NULL,
  `amtpaid` float DEFAULT NULL,
  `balance` float DEFAULT NULL,
  `supplier` varchar(254) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `creditsettlements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `balbf` float DEFAULT NULL,
  `netflow` float DEFAULT NULL,
  `closingbal` float DEFAULT NULL,
  `supplier` varchar(254) DEFAULT NULL,
  `explanation` varchar(254) DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `receivedby` varchar(254) DEFAULT NULL,
  `systemdate` varchar(25) DEFAULT NULL,
  `systemtime` varchar(25) DEFAULT NULL,
  `invoice` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=latin1;
CREATE TABLE `customer_template` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `company` varchar(100) DEFAULT NULL,
  `customer` varchar(250) DEFAULT NULL,
  `productname` varchar(250) DEFAULT NULL,
  `qty` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `customers` (
  `company` varchar(255) DEFAULT NULL,
  `customerid` varchar(254) NOT NULL,
  `address` varchar(25) DEFAULT NULL,
  `location` varchar(125) DEFAULT NULL,
  `phone` varchar(125) DEFAULT NULL,
  `balance` varchar(125) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customerid` (`customerid`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;
CREATE TABLE `debtors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `expirydate` varchar(20) DEFAULT NULL,
  `sellingprice` float DEFAULT NULL,
  `numofunitsold` float DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `systemdate` varchar(35) DEFAULT NULL,
  `tid` varchar(10) DEFAULT NULL,
  `buyerid` varchar(254) DEFAULT NULL,
  `paid` float DEFAULT NULL,
  `bal` varchar(10) DEFAULT NULL,
  `description` varchar(254) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
CREATE TABLE `debtorsfiles` (
  `name` varchar(100) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `debtpayments` (
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `accrueddebt` float DEFAULT NULL,
  `amtpaid` float DEFAULT NULL,
  `balance` float DEFAULT NULL,
  `debtorid` varchar(254) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `debtsettlements` (
  `company` varchar(255) DEFAULT NULL,
  `branchname` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `balbf` float DEFAULT NULL,
  `netflow` float DEFAULT NULL,
  `closingbal` float DEFAULT NULL,
  `debtorid` varchar(254) DEFAULT NULL,
  `refno` varchar(25) DEFAULT NULL,
  `explanation` varchar(254) DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `receivedby` varchar(254) DEFAULT NULL,
  `systemdate` varchar(254) DEFAULT NULL,
  `systemtime` varchar(254) DEFAULT NULL,
  `invoice` varchar(20) DEFAULT NULL,
  `mode` varchar(20) DEFAULT NULL,
  `transactioncode` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=662 DEFAULT CHARSET=latin1;
CREATE TABLE `debtsubtotals` (
  `debtor` varchar(50) NOT NULL DEFAULT '',
  `trno` varchar(12) NOT NULL DEFAULT '',
  `balance` float DEFAULT NULL,
  PRIMARY KEY (`debtor`,`trno`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `departments` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `company` varchar(100) DEFAULT NULL,
  `branchname` varchar(100) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
CREATE TABLE `expirydates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(254) DEFAULT NULL,
  `expirydate` date DEFAULT NULL,
  `nis` float DEFAULT NULL,
  `qtydispensed` float DEFAULT NULL,
  `serialnumber` varchar(12) DEFAULT NULL,
  `tid` varchar(12) DEFAULT NULL,
  `invoiceno` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2995 DEFAULT CHARSET=latin1;
CREATE TABLE `headers` (
  `company` varchar(255) DEFAULT NULL,
  `bsname` varchar(254) NOT NULL,
  `address` varchar(254) DEFAULT NULL,
  `phone` varchar(254) DEFAULT NULL,
  `slogan` varchar(254) DEFAULT NULL,
  `slogan2` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `otherdetails` varchar(50) DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `specialization1` varchar(255) DEFAULT NULL,
  `specialization2` varchar(50) DEFAULT NULL,
  `pinno` varchar(254) DEFAULT NULL,
  `bsregno` varchar(254) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `invoiceslogan` varchar(200) DEFAULT NULL,
  `branchname` varchar(255) NOT NULL,
  PRIMARY KEY (`bsname`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `branchname` varchar(255) DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `debitparticulars` varchar(254) DEFAULT NULL,
  `debitamount` float DEFAULT NULL,
  `creditamount` float DEFAULT NULL,
  `creditparticulars` varchar(254) DEFAULT NULL,
  `systemdate` varchar(25) DEFAULT NULL,
  `debitaccount` varchar(254) DEFAULT NULL,
  `creditaccount` varchar(254) DEFAULT NULL,
  `DFolio` varchar(100) NOT NULL,
  `CFolio` varchar(100) NOT NULL,
  `remarks` varchar(255) NOT NULL,
  `transactiondate` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20841 DEFAULT CHARSET=latin1;
CREATE TABLE `ledgeraccounts` (
  `ledger` varchar(254) DEFAULT NULL,
  `natureofledger` varchar(20) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `otherservices` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `company` varchar(100) DEFAULT NULL,
  `branchname` varchar(100) DEFAULT NULL,
  `service` varchar(200) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `customer` varchar(250) DEFAULT NULL,
  `systemdate` date DEFAULT NULL,
  `systemtime` varchar(20) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `paymentdetails` (
  `bankname` varchar(200) DEFAULT NULL,
  `accountname` varchar(200) DEFAULT NULL,
  `accountnumber` varchar(200) DEFAULT NULL,
  `lipaampesatillno` varchar(200) DEFAULT NULL,
  `mpesapaybillno` varchar(200) DEFAULT NULL,
  `lipanampesatillno` varchar(200) DEFAULT NULL,
  `invoiceslogan` varchar(200) DEFAULT NULL,
  `payeeslocation` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `pendingservices` (
  `service` varchar(150) DEFAULT NULL,
  `price` varchar(8) DEFAULT NULL,
  `clientid` varchar(150) DEFAULT NULL,
  `commitstatus` varchar(10) DEFAULT NULL,
  `rctno` int(11) DEFAULT NULL,
  `day` varchar(6) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pmode` varchar(150) DEFAULT NULL,
  `category` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=250 DEFAULT CHARSET=latin1;
CREATE TABLE `pricingmodes` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `company` varchar(100) DEFAULT NULL,
  `pricing` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
CREATE TABLE `purchases` (
  `company` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `expirydate` date DEFAULT NULL,
  `numofunitsbought` float DEFAULT NULL,
  `costperunit` float DEFAULT NULL,
  `sellingprice` float DEFAULT NULL,
  `systemdate` varchar(50) DEFAULT NULL,
  `addedby` varchar(50) DEFAULT NULL,
  `receiptno` varchar(20) DEFAULT NULL,
  `systemtime` varchar(50) DEFAULT NULL,
  `supplier` varchar(254) DEFAULT NULL,
  `paymentmode` varchar(20) DEFAULT NULL,
  `wholesaleprice` float DEFAULT NULL,
  `paymentstatus` varchar(30) DEFAULT NULL,
  `commitstatus` varchar(20) DEFAULT NULL,
  `purchase_qty` float DEFAULT NULL,
  `department` varchar(255) NOT NULL,
  `TRANSCOUNTY_MAIN` float NOT NULL,
  `TRANSCOUNTY_ANNEX` float NOT NULL,
  `PEAKFARM` float NOT NULL,
  `MAIN_BRANCH` float DEFAULT NULL,
  `ANNEX` float DEFAULT NULL,
  `TOGETHER_MAIN` float DEFAULT NULL,
  `HIGHWAY_BRANCH` float DEFAULT NULL,
  `KITALE_BRANCH` float DEFAULT NULL,
  `KIPKORGOT` float DEFAULT NULL,
  `Teleview` float DEFAULT NULL,
  `MainBranch` float DEFAULT NULL,
  `MAIN` float NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11079 DEFAULT CHARSET=latin1;
CREATE TABLE `quotations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) NOT NULL,
  `qid` int(11) NOT NULL,
  `name` varchar(254) DEFAULT NULL,
  `sellingprice` float NOT NULL,
  `numofunitsold` float NOT NULL,
  `commitstatus` varchar(20) NOT NULL,
  `systemdate` varchar(15) NOT NULL,
  `seller` varchar(100) NOT NULL,
  `systemtime` varchar(20) NOT NULL,
  `status` varchar(20) DEFAULT NULL,
  `buyerid` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1;
CREATE TABLE `rctnos` (
  `rctno` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `rinwards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `branchname` varchar(255) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `receiptno` int(11) DEFAULT NULL,
  `numofunitstoreturn` float DEFAULT NULL,
  `costofreturns` float DEFAULT NULL,
  `systemtime` varchar(200) DEFAULT NULL,
  `systemdate` varchar(200) DEFAULT NULL,
  `receivedby` varchar(200) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=latin1;
CREATE TABLE `routwards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(32) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `descr` varchar(100) DEFAULT NULL,
  `dateofpurchase` varchar(25) DEFAULT NULL,
  `receiptno` int(11) DEFAULT NULL,
  `unitofmeasure` varchar(50) DEFAULT NULL,
  `numofunitstoreturn` float DEFAULT NULL,
  `costofreturns` float DEFAULT NULL,
  `reasonsforreturning` varchar(254) DEFAULT NULL,
  `systemdate` varchar(100) DEFAULT NULL,
  `systemtime` varchar(100) DEFAULT NULL,
  `receivedby` varchar(100) DEFAULT NULL,
  `day` varchar(2) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `price` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
CREATE TABLE `sales` (
  `company` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `expirydate` varchar(50) DEFAULT NULL,
  `numofunitsold` float DEFAULT NULL,
  `costperunit` float DEFAULT NULL,
  `sellingprice` float DEFAULT NULL,
  `systemdate` date DEFAULT NULL,
  `seller` varchar(50) DEFAULT NULL,
  `systemtime` varchar(50) DEFAULT NULL,
  `bid` varchar(200) DEFAULT NULL,
  `receiptno` int(11) DEFAULT NULL,
  `salecategory` varchar(28) DEFAULT NULL,
  `discount` float DEFAULT NULL,
  `commitstatus` varchar(10) DEFAULT NULL,
  `holdno` int(11) DEFAULT NULL,
  `invoiceno` int(11) DEFAULT NULL,
  `vat_obligation` varchar(12) DEFAULT NULL,
  `qbs` float DEFAULT NULL,
  `qas` float DEFAULT NULL,
  `branchname` varchar(255) NOT NULL,
  `department` varchar(100) NOT NULL,
  `CASH` float DEFAULT NULL,
  `MPESA_TILL` float DEFAULT NULL,
  `EQUITY_TILL` float DEFAULT NULL,
  `NATIONAL_BANK` float DEFAULT NULL,
  `CREDIT` float DEFAULT NULL,
  `TWIN_TRANSACTION` varchar(255) DEFAULT NULL,
  `online_synch` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51201 DEFAULT CHARSET=latin1;
CREATE TABLE `services` (
  `company` varchar(255) DEFAULT NULL,
  `servicename` varchar(150) NOT NULL,
  `expenditure` varchar(20) DEFAULT NULL,
  `price` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `settings` (
  `auto_print_sale_receipt` varchar(12) DEFAULT NULL,
  `auto_update_retail_prices` varchar(12) DEFAULT NULL,
  `version` varchar(20) DEFAULT NULL,
  `dateofrenewal` varchar(50) DEFAULT NULL,
  `npm` float DEFAULT NULL,
  `discountlimit` float DEFAULT NULL,
  `show_bsname_in_receipt` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `soldservices` (
  `servicename` varchar(254) DEFAULT NULL,
  `totalexpenditure` float DEFAULT NULL,
  `totalincome` float DEFAULT NULL,
  `day` int(11) DEFAULT NULL,
  `month` varchar(12) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `systemtime` varchar(100) DEFAULT NULL,
  `systemdate` varchar(100) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `explanation` varchar(200) DEFAULT NULL,
  `paymentmode` varchar(50) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `stmt` (
  `customer` varchar(250) DEFAULT NULL,
  `startyear` varchar(4) DEFAULT NULL,
  `startmonth` varchar(15) DEFAULT NULL,
  `endyear` varchar(4) DEFAULT NULL,
  `endmonth` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
CREATE TABLE `stockflow` (
  `company` varchar(255) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(200) DEFAULT NULL,
  `name` varchar(250) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `netflow` float DEFAULT NULL,
  `systemdate` date DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `systemtime` varchar(50) DEFAULT NULL,
  `explanation` varchar(50) DEFAULT NULL,
  `paymentmode` varchar(10) DEFAULT NULL,
  `branchname` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `refno` varchar(200) NOT NULL,
  `TRANSCOUNTY_MAIN` varchar(255) NOT NULL,
  `TRANSCOUNTY_ANNEX` varchar(255) NOT NULL,
  `PEAKFARM` varchar(55) NOT NULL,
  `MAIN_BRANCH` float DEFAULT NULL,
  `ANNEX` float DEFAULT NULL,
  `MainShop` float DEFAULT NULL,
  `KIPKORGOT` float DEFAULT NULL,
  `Teleview` float DEFAULT NULL,
  `MainBranch` float DEFAULT NULL,
  `MAIN` float NOT NULL,
  `Solasa` float NOT NULL,
  `TOGETHER_MAIN` float NOT NULL,
  `HIGHWAY_BRANCH` float NOT NULL,
  `KITALE_BRANCH` float NOT NULL,
  `KIPSONGO_BRANCH` float DEFAULT NULL,
  `RoadBlock` float DEFAULT NULL,
  `ROMA` float DEFAULT NULL,
  `online_synch` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35525 DEFAULT CHARSET=latin1;
CREATE TABLE `superadminlogs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=237 DEFAULT CHARSET=latin1;
CREATE TABLE `suppliers` (
  `company` varchar(255) DEFAULT NULL,
  `supplier` varchar(200) NOT NULL,
  `contacts` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `abbreviation` varchar(5) DEFAULT NULL,
  `balance` float NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company` (`company`,`supplier`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;
CREATE TABLE `unitsofmeasure` (
  `serialnumber` int(11) NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `code` varchar(100) NOT NULL DEFAULT '',
  `name` varchar(254) NOT NULL DEFAULT '',
  `formulation` varchar(255) DEFAULT NULL,
  `minimumlevel` float DEFAULT NULL,
  `normalbp` float DEFAULT NULL,
  `sellingprice` float DEFAULT NULL,
  `wholesaleprice` float DEFAULT NULL,
  `msp` float DEFAULT NULL,
  `description` varchar(150) DEFAULT NULL,
  `expirydate` varchar(30) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `department` varchar(20) DEFAULT NULL,
  `shelfno` varchar(100) DEFAULT NULL,
  `TRANSCOUNTY_MAIN` float DEFAULT NULL,
  `TRANSCOUNTY_ANNEX` float DEFAULT NULL,
  `PEAKFARM` float DEFAULT NULL,
  `vat_obligation` varchar(100) DEFAULT NULL,
  `online_synch` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`serialnumber`)
) ENGINE=InnoDB AUTO_INCREMENT=113206 DEFAULT CHARSET=latin1;
CREATE TABLE `users` (
  `bstype` varchar(100) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `user` varchar(32) NOT NULL,
  `password` varchar(32) DEFAULT NULL,
  `priviledges` varchar(15) DEFAULT NULL,
  `createdby` varchar(254) DEFAULT NULL,
  `status` varchar(15) DEFAULT NULL,
  `systemdate` varchar(30) DEFAULT NULL,
  `systemtime` varchar(30) DEFAULT NULL,
  `R_Addstock` varchar(20) DEFAULT NULL,
  `addexpenses` varchar(12) DEFAULT NULL,
  `viewexpenses` varchar(12) DEFAULT NULL,
  `accessadminpricingmodes` varchar(12) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `branchname` varchar(255) NOT NULL,
  `movefromstoretoshop` varchar(12) DEFAULT NULL,
  `accessitemlist` varchar(12) NOT NULL,
  `effectreturnsinwards` varchar(12) NOT NULL,
  `addfoods` varchar(12) DEFAULT NULL,
  `consumption` varchar(12) DEFAULT NULL,
  `returnsin` varchar(12) DEFAULT NULL,
  `returnsout` varchar(12) DEFAULT NULL,
  `spoilages` varchar(12) DEFAULT NULL,
  `onlineorders` varchar(12) DEFAULT NULL,
  `receivecash` varchar(12) DEFAULT NULL,
  `buystock` varchar(12) DEFAULT NULL,
  `viewsalesreports` varchar(12) NOT NULL,
  PRIMARY KEY (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
