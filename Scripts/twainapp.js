var m_bBusy, /**< The application is waiting for a responce from TWAIN messages*/
    DWObject,
    textStatus = '',
    /**
     * DSM & DS State
     * 1: DSM not loaded, 2: DSM loaded, 3: DSM opened
     * 4: DS opened, 5: DS enabled, 6: Transfer ready, 7: Transferring
     */
    m_DSMState = 2, //For DWT, we assume Source Manager is always loaded
    globalRuntime = {},
    m_pCapSettings = {};
Dynamsoft.WebTwainEnv.Containers = [{
    ContainerId: 'dwtcontrolContainer',
    Width: 940,
    Height: 500
}];

window.onload = function () {
    Dynamsoft.WebTwainEnv.AutoLoad = false;
    Dynamsoft.WebTwainEnv.Containers = [{ ContainerId: 'dwtcontrolContainer', Width: '100%', Height: '500px' }];
    Dynamsoft.WebTwainEnv.RegisterEvent('OnWebTwainReady', Dynamsoft_OnReady);
    /**
     * In order to use the full version, do the following
     * 1. Change Dynamsoft.WebTwainEnv.Trial to false
     * 2. Replace A-Valid-Product-Key with a full version key
     * 3. Change Dynamsoft.WebTwainEnv.ResourcesPath to point to the full version 
     *    resource files that you obtain after purchasing a key
     */
    Dynamsoft.WebTwainEnv.Trial = true;
    //Dynamsoft.WebTwainEnv.ProductKey = "A-Valid-Product-Key";
    //Dynamsoft.WebTwainEnv.ResourcesPath = "https://tst.dynamsoft.com/libs/dwt/15.0";

    Dynamsoft.WebTwainEnv.Load();
};

function Dynamsoft_OnReady() {
    DWObject = Dynamsoft.WebTwainEnv.GetWebTwain('dwtcontrolContainer');
    if (DWObject) {
        DWObject.SetViewMode(2, 1);
        DWObject.ShowPageNumber = true;
        addContextMenuToDWTViewer();
        SelectADSM();
    }
}

function DSMVChanged() {
    if (DWObject) {
        if (document.getElementById('DSMV2').checked && DWObject)
            DWObject.IfUseTWAINDSM = true;
        else
            DWObject.IfUseTWAINDSM = false;
        connectDSM();
    }
}

function connectDSM() {
    if (m_DSMState > 2) {
        PrintCMDMessage("The DSM has already been opened, close it first.\n");
        return;
    }
    if (DWObject) {
        if (DWObject.OpenSourceManager()) {
            PrintCMDMessage("Successfully opened the DSM.\n");
            m_DSMState = 3;
            DWObject.IfShowUI = false;
            DWObject.IfDisableSourceAfterAcquire = true;
            SelectADS();
        }
    }
    return;
}

function disconnectDSM() {
    if (m_DSMState < 3) {
        PrintCMDMessage("The DSM has not been opened, open it first.\n");
        return false;
    }
    if (DWObject.CloseSourceManager()) {
        PrintCMDMessage("Successfully closed the DSM.\n");
        m_DSMState = 2;
        return true;
    } else {
        printError("Failed to close the DSM.");
        return false;
    }
}

function SelectADSM() {
    var showDSMSelector = function () {
        $("#DSMSelect").dialog({
            resizable: false,
            height: 200,
            width: 400,
            modal: true,
            buttons: {
                "OK": function () {
                    DSMVChanged();
                    $(this).dialog("close");
                }
            }
        });
    };
    if (m_DSMState > 2) {
        PrintCMDMessage("The DSM is open, now closing it.\n");
        if (disconnectDSM())
            showDSMSelector();
    } else {
        showDSMSelector();
    }
}

function SelectADS() {
    if (DWObject) {
        if (closeDS())
            DWObject.SelectSource(function () {
                loadDS();
            }, function () {
                PrintCMDMessage("Failed to Select A Data Source");
            });
    }
}

function closeDS() {
    if (DWObject) {
        if (m_DSMState == 4) {
            PrintCMDMessage("Data Source " + DWObject.CurrentSourceName + " is Open, Closing...");
            if (DWObject.CloseSource()) {
                PrintCMDMessage("Successfully closed the Data Source");
                m_DSMState = 3;
                $('#tBodyCAPList').html("");
                return true;
            } else {
                PrintCMDMessage("Failed to close the Data Source " + DWObject.CurrentSourceName);
                return false;
            }
        } else {
            return true;
        }
    }
}

function loadDS() {
    if (m_DSMState < 3) {
        PrintCMDMessage("The DSM needs to be opened first.\n");
        return;
    } else if (m_DSMState > 3) {
        PrintCMDMessage("A source has already been opened, please close it first\n");
        return;
    }
    Dynamsoft.Lib.showMask();
    setTimeout(function () {
        DWObject.SetOpenSourceTimeout(2000);
        if (DWObject.OpenSource()) {
            PrintCMDMessage(DWObject.CurrentSourceName + ": Data source successfully opened!\n");
            m_DSMState = 4;
            ListSupportedCaps();
            PopulateCurentValues(false, null, true);
            saveInfo();
            Dynamsoft.Lib.hideMask();
        } else {
            PrintCMDMessage("Data source can't be opened!", "popup");
            Dynamsoft.Lib.hideMask();
        }
    }, (1000));
}

function get_CAP(_capabilityID, _msg) {
    if (_msg != MSG_GET && _msg != MSG_GETCURRENT && _msg != MSG_GETDEFAULT && _msg != MSG_RESET) {
        PrintCMDMessage("Bad Message.\n");
        return TWCC_BUMMER;
    }

    if (m_DSMState < 4) {
        PrintCMDMessage("You need to open a data source first.\n");
        return TWCC_SEQERROR;
    }
    if (typeof (_capabilityID) != "undefined")
        DWObject.Capability = _capabilityID;
    var _capability = {
        inquirable: false,
        Cap: _capabilityID,
        OperationType: 0
    };

    var QS = QuerySupport_CAP(_capabilityID);
    _capability.OperationType = QS;
    if (QS & TWQC_GET) {
        _capability.inquirable = true;
        PrintCMDMessage("Getting the Capability: " + convertCAP_toDetailedString(_capabilityID), 1);
        //if (33030 == DWObject.Capability) debugger;
        if (DWObject.CapGet()) {
            PrintCMDMessage("CapGet Successful!");
            _capability.ConType = DWObject.CapType;
            _capability.CapValueType = DWObject.CapValueType;
            _capability.CapNumItems = -1;
            _capability.ArrayStringValues = "";
            _capability.ActualValues = [];
            _capability.CurrentIndex = -1;
            _capability.CurrentValue = "";
            var uVal, values = [],
                i, _min, _max, _step, _currentValue, objRange,
                sItemValue = [];
            switch (_capability.CapValueType) {
                case TWTY_INT32:
                case TWTY_UINT32:
                case TWTY_INT16:
                case TWTY_UINT16:
                case TWTY_INT8:
                case TWTY_UINT8:
                case TWTY_BOOL:
                    switch (_capability.ConType) {
                        case TWON_ARRAY:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItems(i);
                                values.push(uVal);
                                sItemValue.push(convertCAP_Item_toString(_capability.Cap, uVal, _capability.CapValueType));
                            }
                            _capability.CurrentValue = sItemValue.join(", ");
                            break;
                        case TWON_ENUMERATION:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItems(i);
                                values.push(uVal);
                                sItemValue.push(convertCAP_Item_toString(_capability.Cap, uVal, _capability.CapValueType));
                            }
                            _capability.CurrentIndex = DWObject.CapCurrentIndex;
                            _capability.CurrentValue = sItemValue[_capability.CurrentIndex];
                            break;
                        case TWON_RANGE:
                            _min = DWObject.CapMinValue;
                            _max = DWObject.CapMaxValue;
                            _step = DWObject.CapStepSize;
                            _currentValue = DWObject.CapCurrentValue;
                            objRange = {
                                min: _min,
                                max: _max,
                                step: _step,
                                value: _currentValue
                            };
                            values.push(objRange);
                            sItemValue.push([_min, _max, _step, _currentValue].toString());
                            _capability.CurrentValue = _currentValue.toString();
                            break;
                        case TWON_ONEVALUE:
                            uVal = DWObject.CapValue;
                            values.push(uVal);
                            uVal = convertCAP_Item_toString(_capability.Cap, uVal, _capability.CapValueType);
                            sItemValue.push(uVal);
                            _capability.CurrentValue = sItemValue[0];
                            break;
                        default:
                            printError("Unknow Container Type");
                            _capability.CurrentValue = "Unknown Container Type";
                    }
                    break;
                case TWTY_STR32:
                case TWTY_STR64:
                case TWTY_STR128:
                case TWTY_STR255:
                    switch (_capability.ConType) {
                        case TWON_ARRAY:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItemsString(i);
                                values.push(uVal);
                                sItemValue.push(uVal);
                            }
                            _capability.CurrentValue = sItemValue.join(", ");
                            break;
                        case TWON_ENUMERATION:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItemsString(i);
                                values.push(uVal);
                                sItemValue.push(uVal);
                            }
                            _capability.CurrentIndex = DWObject.CapCurrentIndex;
                            _capability.CurrentValue = sItemValue[_capability.CurrentIndex];
                            break;
                        case TWON_RANGE:
                            printError("Invalid Capability that has the Type of Range but ValueType of String!");
                            _capability.CurrentValue = "Invalid Capability that has the Type of Range but ValueType of Frame!";
                            return false;
                        case TWON_ONEVALUE:
                            uVal = DWObject.CapValueString;
                            values.push(uVal);
                            sItemValue.push(uVal);
                            _capability.CurrentValue = sItemValue[0];
                            break;
                        default:
                            printError("Unknow Container Type");
                            _capability.CurrentValue = "Unknown Container Type";
                    }
                    break;
                case TWTY_FIX32:
                    switch (_capability.ConType) {
                        case TWON_ARRAY:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItems(i);
                                values.push(uVal);
                                sItemValue.push(uVal.toFixed(3).toString());
                            }
                            _capability.CurrentValue = sItemValue.join(", ");
                            break;
                        case TWON_ENUMERATION:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = DWObject.GetCapItems(i);
                                values.push(uVal);
                                sItemValue.push(uVal.toFixed(3).toString());
                            }
                            _capability.CurrentIndex = DWObject.CapCurrentIndex;
                            _capability.CurrentValue = sItemValue[_capability.CurrentIndex];
                            break;
                        case TWON_RANGE:
                            _min = DWObject.CapMinValue;
                            _max = DWObject.CapMaxValue;
                            _step = DWObject.CapStepSize;
                            _currentValue = DWObject.CapCurrentValue;
                            objRange = {
                                min: _min,
                                max: _max,
                                step: _step,
                                value: _currentValue
                            };
                            values.push(objRange);
                            sItemValue.push([_min, _max, _step, _currentValue].toString());
                            _capability.CurrentValue = _currentValue.toFixed(3).toString();
                            break;
                        case TWON_ONEVALUE:
                            uVal = DWObject.CapValue;
                            values.push(uVal);
                            sItemValue.push(uVal.toFixed(3).toString());
                            _capability.CurrentValue = sItemValue[0];
                            break;
                        default:
                            printError("Unknow Container Type");
                            _capability.CurrentValue = "Unknown Container Type";
                    }
                    break;
                case TWTY_FRAME:
                    switch (_capability.ConType) {
                        case TWON_ARRAY:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = [];
                                uVal.push((DWObject.CapGetFrameLeft(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameRight(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameTop(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameBottom(i)).toFixed(3));
                                values.push(uVal);
                                sItemValue.push("[" + uVal.join(' ') + "]");
                            }
                            _capability.CurrentValue = sItemValue.join(", ");
                            break;
                        case TWON_ENUMERATION:
                            _capability.CapNumItems = DWObject.CapNumItems;
                            for (i = 0; i < _capability.CapNumItems; i++) {
                                uVal = [];
                                uVal.push((DWObject.CapGetFrameLeft(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameRight(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameTop(i)).toFixed(3));
                                uVal.push((DWObject.CapGetFrameBottom(i)).toFixed(3));
                                values.push(uVal);
                                sItemValue.push("[" + uVal.join(' ') + "]");
                            }
                            _capability.CurrentIndex = DWObject.CapCurrentIndex;
                            _capability.CurrentValue = sItemValue[_capability.CurrentIndex];
                            break;
                        case TWON_RANGE:
                            printError("Invalid Capability that has the Type of Range but ValueType of Frame!");
                            _capability.CurrentValue = "Invalid Capability that has the Type of Range but ValueType of Frame!";
                            return false;
                        case TWON_ONEVALUE:
                            uVal = [];
                            uVal.push((DWObject.CapGetFrameLeft(0)).toFixed(3));
                            uVal.push((DWObject.CapGetFrameRight(0)).toFixed(3));
                            uVal.push((DWObject.CapGetFrameTop(0)).toFixed(3));
                            uVal.push((DWObject.CapGetFrameBottom(0)).toFixed(3));
                            values.push(uVal);
                            sItemValue.push("[" + uVal.join(' ') + "]");
                            _capability.CurrentValue = sItemValue[0];
                            break;
                        default:
                            printError("Unknow Container Type");
                            _capability.CurrentValue = "Unknown Container Type";
                    }
                    break;
                default:
                    uVal = "UnKnown Value Type";
                    _capability.CurrentValue = uVal;
                    printError(uVal);
                    values.push(uVal);
                    sItemValue.push(uVal);
            }
            _capability.ArrayStringValues = sItemValue;
            _capability.ActualValues = values;
        } else {
            _capability.inquirable = false;
            PrintCMDMessage("CapGet Failed");
        }
    }
    return _capability;
}

function ListSupportedCaps() {
    var i, j, nCount = 0,
        sCapName = "",
        CapSupportedCaps;
    $('#tBodyCAPList').html("");
    m_pCapSettings = {
        "SourceName": DWObject.CurrentSourceName
    };
    // get the supported capabilies
    CapSupportedCaps = get_CAP(CAP_SUPPORTEDCAPS, MSG_GET);
    if (!CapSupportedCaps.inquirable) {
        PrintCMDMessage("Failed to list supported capabilities.\n");
        return false;
    }

    if (TWON_ARRAY != CapSupportedCaps.ConType) {
        PrintCMDMessage("Supported capabilities don't come in an Array, can't process.\n");
        return false;
    }

    if (TWTY_UINT16 != DWObject.CapValueType) {
        PrintCMDMessage("Capability values are illegal, can't process.\n");
        return false;
    }

    nCount = DWObject.CapNumItems;

    for (i = 0; i < nCount; i++) {
        var Item = {
            pszText: "",
            detailedText: "",
            CapID: -1, // The ID of the Capability
            byChanged: 0, // Each bit is used to indicate if that colume has changed.
            bReadOnly: false // The Cap is only read only
        };
        Item.CapID = parseInt(DWObject.GetCapItems(i));
        if (Item.CapID == CAP_SUPPORTEDCAPS) continue; //skip this capability
        DWObject.Capability = Item.CapID;
        /* if (DWObject.CapGetLabel() || DWObject.CapGetLabels()) {
             Item.pszText = "";
             Item.detailedText = "";
         } else {*/
        Item.pszText = convertCAP_toString(Item.CapID);
        Item.detailedText = convertCAP_toDetailedString(Item.CapID);
        //}
        var _newTR = document.createElement('tr');
        _newTR.id = "CAP_" + Item.CapID;
        var _newTD = null;
        for (j = 0; j < 8; j++) {
            _newTD = document.createElement('td');
            switch (j) {
                case 6:
                case 7:
                    _newTD.innerText = i.toString();
                    _newTD.style.display = "none";
                    break;
                case 0:
                    _newTD.style.fontSize = "x-small";
                    _newTD.style.padding = "0 5px";
                    _newTD.style.fontFamily = 'Consolas,"Liberation Mono",Menlo,Courier,monospace';
                    if (Item.detailedText != "")
                        _newTD.innerText = Item.detailedText + ' ' + Item.CapID;
                    else
                        _newTD.innerText = Item.pszText + ' ' + Item.CapID;
                    break;
                default:
                    _newTD.style.textAlign = "center";
            }
            _newTR.appendChild(_newTD);
        }
        /*<th style="width:30%;">Capability</th>
        <th style="width:30%;">Current Value</th>
        <th style="width:10%;">Container</th>
        <th style="width:10%;">#</th>
        <th style="width:20%;">Operation Type</th>*/
        document.getElementById('tBodyCAPList').appendChild(_newTR);
        m_pCapSettings["CAP_" + Item.CapID] = Item;
    }
}

function PopulateCurentValues(bCheckForChange /*=true*/, nIDtoCheck, bInitialize) {
    m_bBusy = true;
    var nItem,
        QS = 0,
        sItemValue,
        byChanged,
        bReadOnly,
        bEnumerationAsOneValue,
        CapID,
        Cap;

    for (nItem in m_pCapSettings) {
        CapID = m_pCapSettings[nItem].CapID;
        if (nIDtoCheck) {
            if (CapID != nIDtoCheck)
                continue;
        }
        bReadOnly = false;
        bEnumerationAsOneValue = false;
        byChanged = 0;
        if (!bCheckForChange) {
            m_pCapSettings[nItem].inquirable = false;
            m_pCapSettings[nItem].CapValueType = -1;
            m_pCapSettings[nItem].ValueType = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].ArrayStringValues = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].OldStringValues = "";
            m_pCapSettings[nItem].ActualValues = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].CurrentValue = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].CurrentIndex = -1;
            m_pCapSettings[nItem].ValueBeforeTheChange = "";
            m_pCapSettings[nItem].ConType = -1;
            m_pCapSettings[nItem].Container = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].Count = "";
            m_pCapSettings[nItem].OperationType = 0;
            m_pCapSettings[nItem].StrOpType = "&lt;&lt;BADPROTOCOL&gt;&gt;";
            m_pCapSettings[nItem].bEnumerationAsOneValue = bEnumerationAsOneValue;
            m_pCapSettings[nItem].bReadOnly = bReadOnly;
            m_pCapSettings[nItem].byChanged = byChanged;
        }
        // We will ignor what Query Supported has reproted about Message Get and get the current anyway.
        // if (m_pCapSettings[nItem].CapID == 4378) debugger;


        /**test 
        DWObject.Capability = CapID;
        DWObject.CapGet();
        if (DWObject.CapType != TWON_ARRAY) continue;
        /**test */


        /**
         * Get Cap
         */
        var uVal,
            nNumItems = 0;
        Cap = get_CAP(CapID, MSG_GET);

        /**
         * Operation Types
         */
        QS = Cap.OperationType;
        m_pCapSettings[nItem].inquirable = Cap.inquirable;
        m_pCapSettings[nItem].OperationType = QS;
        m_pCapSettings[nItem].ConType = Cap.ConType;
        m_pCapSettings[nItem].CapValueType = Cap.CapValueType;
        sItemValue = "";
        if (QS & (TWQC_GET | TWQC_GETDEFAULT | TWQC_GETCURRENT)) {
            sItemValue += "Get";
        }
        if (QS & TWQC_SET) {
            if (sItemValue != "")
                sItemValue += ", ";
            sItemValue += "Set";
        }
        if (QS & TWQC_RESET) {
            if (sItemValue != "")
                sItemValue += ", ";
            sItemValue += "Reset";
        }
        if (bCheckForChange) {
            if (m_pCapSettings[nItem].StrOpType != sItemValue) {
                m_pCapSettings[nItem].StrOpType = "Old: " + m_pCapSettings[nItem].StrOpType +
                    "\nNew: " + sItemValue;
                byChanged += 8;
            } else
                byChanged += 0;
        }
        m_pCapSettings[nItem].StrOpType = sItemValue;
        if (Cap.inquirable) {
            sItemValue = Cap.CurrentValue;
            if (bCheckForChange) {
                if (Cap.ConType == TWON_ARRAY) {
                    var _arrayChanged = false;
                    if (m_pCapSettings[nItem].ArrayStringValues.length == Cap.ArrayStringValues.length) {
                        for (var i = 0; i < Cap.ArrayStringValues.length; i++) {
                            if (m_pCapSettings[nItem].ArrayStringValues[i] != Cap.ArrayStringValues[i])
                                _arrayChanged = true;
                            break;
                        }
                    } else
                        _arrayChanged = true;
                    if (_arrayChanged) {
                        byChanged += 1;
                        m_pCapSettings[nItem].OldStringValues = m_pCapSettings[nItem].ArrayStringValues;
                    }
                } else if (Cap.ConType != TWON_ARRAY && m_pCapSettings[nItem].CurrentValue != sItemValue) {
                    byChanged += 1;
                    m_pCapSettings[nItem].ValueBeforeTheChange = m_pCapSettings[nItem].CurrentValue;
                } else
                    byChanged += 0;
            }
            type = Cap.CapValueType;
            m_pCapSettings[nItem].ValueType = convertTWTY_toString(type) + "(" + type + ")";
            m_pCapSettings[nItem].ActualValues = Cap.ActualValues;
            m_pCapSettings[nItem].ArrayStringValues = Cap.ArrayStringValues;
            m_pCapSettings[nItem].CurrentValue = sItemValue;
            if (bInitialize)
                m_pCapSettings[nItem].InitialValue = sItemValue;
            m_pCapSettings[nItem].CurrentIndex = Cap.CurrentIndex;
            /**
             * Cap Type
             */
            switch (Cap.ConType) {
                case TWON_ARRAY:
                    sItemValue = "Array";
                    break;

                case TWON_ENUMERATION:
                    sItemValue = "Enumeration";
                    break;

                case TWON_ONEVALUE:
                    sItemValue = "One Value";
                    break;

                case TWON_RANGE:
                    sItemValue = "Range";
                    break;
            }
            if (bCheckForChange) {
                if (m_pCapSettings[nItem].Container != sItemValue) {
                    m_pCapSettings[nItem].Container = "Old: " + m_pCapSettings[nItem].Container +
                        "\nNew: " + sItemValue;
                    byChanged += 2;
                } else
                    byChanged += 0;
            }
            m_pCapSettings[nItem].Container = sItemValue;

            /**
             * Items Count (NumItems)
             */
            if (Cap.ConType == TWON_ARRAY ||
                Cap.ConType == TWON_ENUMERATION) {
                nNumItems = DWObject.CapNumItems;
                sItemValue = nNumItems.toString();
            } else {
                sItemValue = "";
            }
            if (bCheckForChange) {
                if (m_pCapSettings[nItem].Count != sItemValue) {
                    m_pCapSettings[nItem].Count = "Old: " + m_pCapSettings[nItem].Count +
                        "\nNew: " + sItemValue;
                    byChanged += 4;
                } else
                    byChanged += 0;
            }
            m_pCapSettings[nItem].Count = sItemValue;

            /**
             * Check whether it's read only
             */
            if (Cap.ConType == TWON_ENUMERATION && nNumItems <= 1) {
                bEnumerationAsOneValue = true;
            }
            if (!(QS & TWQC_SET)) {
                bReadOnly = true;
            }
        } else {
            PrintCMDMessage(DWObject.ErrorString);
        }
        m_pCapSettings[nItem].bEnumerationAsOneValue = bEnumerationAsOneValue;
        m_pCapSettings[nItem].bReadOnly = bReadOnly;
        m_pCapSettings[nItem].byChanged = byChanged;
        syncTable(CapID, m_pCapSettings[nItem]);
    }
    if (nIDtoCheck) {
        //No need to sort
    } else {
        if (bCheckForChange) {
            setTimeout(function () {
                $.tablesorter.destroy($("#tblCAPList"), true, function () { });
                $("#tblCAPList").tablesorter({
                    sortList: [
                        [7, 0]
                    ],
                    cssAsc: "sortUp",
                    cssDesc: "sortDown",
                    widgets: ["zebra"]
                });
                var $container = $('#capabilities'),
                    $scrollTo = $('#tblCAPListHead');
                $container.animate({
                    scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop()
                });
            }, 1000);
        } else {
            $("tr").off("mouseover").on("mouseover", function () {
                $(this).addClass("over");
            });

            $("tr").off("mouseout").on("mouseout", function () {
                $(this).removeClass("over");
            });
        }
    }
    m_bBusy = false;
    Dynamsoft.Lib.hideMask();
}

function syncTable(_CapID, _CapSettingItem) {
    var syncOne = function (_CapID, _CapSettingItem) {
        $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(2)").html(_CapSettingItem.CurrentValue);
        $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(3)").html(_CapSettingItem.ValueType);
        $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(4)").html(_CapSettingItem.Container);
        $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(5)").html(_CapSettingItem.Count);
        $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(6)").html(_CapSettingItem.StrOpType);
        if (_CapSettingItem.bReadOnly)
            $("#tblCAPList tr#CAP_" + _CapID).addClass("ReadOnly");

        $("#tblCAPList tr#CAP_" + _CapID + " td").removeClass();
        if (_CapSettingItem.byChanged != 0)
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(8)").html("-1");
        else
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(8)").html($("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(7)").html());
        if (_CapSettingItem.byChanged & 0x0001) // Value Changed
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(" + 2 + ")").addClass("Changed");
        if (_CapSettingItem.byChanged & 0x0002) // Con Type Changed
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(" + 4 + ")").addClass("Changed");
        if (_CapSettingItem.byChanged & 0x0004) // Number Count Changed
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(" + 5 + ")").addClass("Changed");
        if (_CapSettingItem.byChanged & 0x0008) // Op Type Changed
            $("#tblCAPList tr#CAP_" + _CapID + " td:nth-child(" + 6 + ")").addClass("Changed");

    };
    if (_CapID) {
        setTimeout(function () {
            syncOne(_CapID, _CapSettingItem);
        }, 0);
    } else {
        $.each($("#tblCAPList tr"), function (key, tr) {
            if (tr.id != "") {
                var _capIDInTable = parseInt(tr.id.substr(4));
                syncOne(_capIDInTable, m_pCapSettings[tr.id]);
            }
        });
    }
    $("#tblCAPList tr#CAP_" + _CapID).off("dblclick").on("dblclick", function () {
        OnNMDblclkCaps(_CapID);
    });
}

function QuerySupport_CAP(_cap) {
    var _QS = 0;
    if (m_DSMState < 4) {
        PrintCMDMessage("You need to open a data source first.\n");
        return _QS;
    }
    if (DWObject.CapIfSupported(TWQC_GET)) _QS += 0x0001;
    if (DWObject.CapIfSupported(TWQC_SET)) _QS += 0x0002;
    if (DWObject.CapIfSupported(TWQC_GETDEFAULT)) _QS += 0x0004;
    if (DWObject.CapIfSupported(TWQC_GETCURRENT)) _QS += 0x0008;
    if (DWObject.CapIfSupported(TWQC_RESET)) _QS += 0x0010;
    /*if (DWObject.CapIfSupported(TWQC_SETCONSTRAINT)) _QS += 0x0020;
    if (DWObject.CapIfSupported(TWQC_CONSTRAINABLE)) _QS += 0x0040;
    if (DWObject.CapIfSupported(TWQC_GETHELP)) _QS += 0x0100;
    if (DWObject.CapIfSupported(TWQC_GETLABEL)) _QS += 0x0200;
    if (DWObject.CapIfSupported(TWQC_GETLABELENUM)) _QS += 0x0400;*/
    if (_QS == 0) {
        var strErr = "Failed to query support of the capability: [";
        strErr += convertCAP_toString(_cap);
        strErr += "]";
        PrintCMDMessage(strErr);
    }
    //if (_QS == 2) debugger;
    return _QS;
}

// This method sets the new current value.
// TODO set constraints using Enumerations and Ranges
function OnNMDblclkCaps(_CapID) {
    var bChange = false,
        twrc, _type, _val, _btn,
        newValue, _valueList = [],
        _valueItemClass = " ",
        _checkedornot = false,
        // get the capability that is supported        
        //Cap = get_CAP(_CapID, MSG_GET);
        Cap = m_pCapSettings["CAP_" + _CapID];
    var updateTable = function (_bChange, _nID) {
        if (_bChange) {
            if (globalRuntime.neverShowTheWarningAgain) {
                if (globalRuntime.bReloadAll) {
                    setTimeout(function () {
                        PopulateCurentValues(true);
                    }, 100);
                } else {
                    setTimeout(function () {
                        PopulateCurentValues(true, _nID);
                    }, 100);
                }
                return;
            }
            // Modifiying one CAP can change several others - repopulate the list of CAPS
            $("#ValueSelector").html([
                "<p>Reload the entire form will be <strong>time-consuming</strong> but will show you which ",
                "capabilities have changed related to the change you just made.",
                "<br /><br /> Do you want to reload the entire form?</p>",
                "<br /><br /><input type='checkbox' id='neverShowTheWarningAgain'> Don't ask again"
            ].join(""));
            $("#ValueSelector").dialog({
                title: "Do you want to reload the entire form?",
                resizable: true,
                width: 600,
                modal: true,
                buttons: {
                    "Sure, Go ahead!": function () {
                        if ($('#neverShowTheWarningAgain').prop("checked")) {
                            globalRuntime.neverShowTheWarningAgain = true;
                            globalRuntime.bReloadAll = true;
                        }
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                        Dynamsoft.Lib.showMask();
                        setTimeout(function () {
                            PopulateCurentValues(true);
                        }, 100);
                    },
                    "No, Time matters!": function () {
                        if ($('#neverShowTheWarningAgain').prop("checked")) {
                            globalRuntime.neverShowTheWarningAgain = true;
                            globalRuntime.bReloadAll = false;
                        }
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                        Dynamsoft.Lib.showMask();
                        setTimeout(function () {
                            PopulateCurentValues(true, _nID);
                        }, 100);
                    }
                }
            });
            $("#ValueSelector").disableSelection();
        }
    };
    // get possible values to populate dialog box with
    if (Cap.inquirable) {
        var _values = Cap.ActualValues,
            _strValues = Cap.ArrayStringValues,
            _currentValue = Cap.CurrentValue,
            bReadOnly = Cap.bReadOnly;
        _type = Cap.CapValueType;
        globalRuntime.CapabilityNegotiation = {
            id: _CapID,
            values: _values,
            oneValue: _currentValue,
            oldIndex: -1,
            newIndex: -1,
            rangeCurrentValue: null,
            EnumerationAsOneValue_New: null
        };
        if (Cap.ConType == TWON_ENUMERATION) {
            _valueList = [];
            _valueItemClass = " ";
            _checkedornot = false;
            $("#ValueSelector").html("");
            if (Cap.bEnumerationAsOneValue) {
                _valueItemClass = "ui-state-default";
                var _validate = function () {
                    var bValidated = false;
                    newValue = $.trim($("#EnumerationAsOneValue_New").val());
                    if (newValue != "") {
                        if (_type < 8) { /* number */
                            if (!/^\s*$/.test(newValue) && !isNaN(newValue)) {
                                globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New = newValue;
                                $("#EnumerationAsOneValue li:last").html("New: " + newValue);
                                bValidated = true;
                            } else {
                                $("#EnumerationAsOneValue_New").focus();
                                $("#EnumerationAsOneValue_New").addClass("invalid");
                            }
                        } else if (_type == TWTY_FRAME) {
                            var _frameLRTB = newValue.split(","),
                                bInvalid = false;
                            if (_frameLRTB.length == 4) {
                                $.each(_frameLRTB, function (_k, _o) {
                                    if (/^\s*$/.test(_o) || isNaN(_o))
                                        bInvalid = true;
                                    else {
                                        _frameLRTB[_k] = Number(_o);
                                    }
                                });
                            } else bInvalid = true;
                            if (bInvalid) {
                                $("#EnumerationAsOneValue_New").focus();
                                $("#EnumerationAsOneValue_New").addClass("invalid");
                            } else {
                                bValidated = true;
                                globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New = _frameLRTB;
                                $("#EnumerationAsOneValue li:last").html("New: " + newValue);
                            }
                        } else {
                            bValidated = true;
                            globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New = newValue;
                            $("#EnumerationAsOneValue li:last").html("New: " + newValue);
                        }
                    } else
                        $("#EnumerationAsOneValue_New").focus();
                    return bValidated;
                };
                $("#ValueSelector").append(
                    ["<ul id='EnumerationAsOneValue' style='text-align:left'>",
                        "<li class='", _valueItemClass, "'>",
                        "Old: <span>", _values[0], " (", _currentValue, ")",
                        "</span></li>",
                        "<li class='", _valueItemClass, "'>",
                        "New: <input id='EnumerationAsOneValue_New' type='text' style='width:60%'/>",
                        "</ul>"
                    ].join("")
                );
                $("#EnumerationAsOneValue_New").focus();
                $("#EnumerationAsOneValue_New").off('blur').on('blur', function () {
                    _validate();
                    $("#EnumerationAsOneValue_New").focus();
                });
                $("#EnumerationAsOneValue_New").off('keypress').on('keypress', function (event) {
                    if (event.which == 13) {
                        event.preventDefault();
                        _validate();
                    }
                });
                $("#EnumerationAsOneValue li:last").off('click').on('click', function (event) {
                    switch ($("#EnumerationAsOneValue li:last input").length) {
                        case 0:
                            $("#EnumerationAsOneValue li:last").html(
                                "New: <input id='EnumerationAsOneValue_New' type='text' style='width:60%'/>"
                            );
                            $("#EnumerationAsOneValue_New").text(globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New);
                            break;
                        case 1:
                            /** Do nothing */
                            break;
                    }
                });
            } else {
                for (_val in _values) {
                    if (_currentValue == _strValues[_val]) {
                        _checkedornot = "checked";
                        globalRuntime.CapabilityNegotiation.oldIndex = parseInt(_val);
                        globalRuntime.CapabilityNegotiation.newIndex = parseInt(_val);
                        _valueItemClass = "seletedValueItem";
                    } else {
                        _checkedornot = "";
                        _valueItemClass = " ";
                    }
                    _valueList.push("<li class='" + _valueItemClass + "'><label for='" + "_values_" + _values[_val] +
                        "'><input " + _checkedornot + " type='radio' name='_list_" + Cap.CapID +
                        "' id='_values_" + _values[_val] + "' _index='" + _val + "'> " + _strValues[_val] + " </label></li > ");
                }

                $("#ValueSelector").append(
                    "<ul style='text-align:left'>" + _valueList.join("") +
                    "</ul>"
                );
                $("#ValueSelector ul li").off("mouseover").on("mouseover", function () {
                    $(this).addClass("over");
                });

                $("#ValueSelector ul li").off("mouseout").on("mouseout", function () {
                    $(this).removeClass("over");
                });
                $("#ValueSelector ul").off("click").on("click", function () {
                    $("#ValueSelector ul li").removeClass('seletedValueItem');
                    $("input[name='_list_" + Cap.CapID + "']:checked").parent().parent().addClass('seletedValueItem');
                });
                $("#ValueSelector ul li").off("click").on("click", function () {
                    $(this).find('input').prop('checked', true);
                    globalRuntime.CapabilityNegotiation.newIndex = parseInt($(this).find('input').attr('_index'));
                });
            }
            if (Cap.bReadOnly) {
                _btn = {
                    "Close": function () {
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                    }
                };
            } else
                _btn = {
                    "OK": function () {
                        if (Cap.bEnumerationAsOneValue) {
                            if (globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New) {
                                if (_type < 8)
                                    twrc = set_CapabilityOneValue(Cap.CapID, globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New, 'number');
                                else if (_type == TWTY_FRAME)
                                    twrc = set_CapabilityOneValue(Cap.CapID, globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New, 'frame');
                                else
                                    twrc = set_CapabilityOneValue(Cap.CapID, globalRuntime.CapabilityNegotiation.EnumerationAsOneValue_New, 'string');
                            } else return false;
                        } else {
                            if (globalRuntime.CapabilityNegotiation.newIndex != globalRuntime.CapabilityNegotiation.oldIndex) {
                                switch (_type) {
                                    case TWTY_INT8:
                                    case TWTY_INT16:
                                    case TWTY_INT32:
                                    case TWTY_UINT8:
                                    case TWTY_UINT16:
                                    case TWTY_UINT32:
                                    case TWTY_BOOL:
                                    case TWTY_FIX32:
                                        var _objVerify = {
                                            valueBeforeSet: _values[Cap.CurrentIndex],
                                            valueAfterSet: null
                                        };
                                        twrc = set_CapabilityEnumeration(Cap.CapID,
                                            globalRuntime.CapabilityNegotiation.values[globalRuntime.CapabilityNegotiation.newIndex],
                                            globalRuntime.CapabilityNegotiation.newIndex,
                                            _objVerify);
                                        if (twrc) {
                                            if (_objVerify.valueBeforeSet != _objVerify.valueAfterSet &&
                                                _objVerify.valueAfterSet == globalRuntime.CapabilityNegotiation.values[globalRuntime.CapabilityNegotiation.newIndex]) {
                                                // Setting Enumeration by Index succeeded
                                            } else {
                                                PrintCMDMessage("Failed to set an Enumeration by index, now tryint to set it by value <TWON_ONEVALUE>");
                                                twrc = set_CapabilityOneValue(Cap.CapID,
                                                    globalRuntime.CapabilityNegotiation.values[globalRuntime.CapabilityNegotiation.newIndex],
                                                    'number');
                                            }
                                        }
                                        break;
                                    case TWTY_STR32:
                                    case TWTY_STR64:
                                    case TWTY_STR128:
                                    case TWTY_STR255:
                                        twrc = set_CapabilityOneValue(Cap.CapID,
                                            globalRuntime.CapabilityNegotiation.values[globalRuntime.CapabilityNegotiation.newIndex],
                                            'string');
                                        break;
                                    default:
                                        PrintCMDMessage("Setting this data type is not implemented.  Patches welcome.", "Not Implemented");
                                        break;

                                }
                            }
                        }
                        if (twrc) {
                            bChange = true;
                        }
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                        setTimeout(function () {
                            updateTable(bChange, Cap.CapID);
                        }, 100);
                    },
                    "Close": function () {
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                    }
                };
            $("#ValueSelector").dialog({
                title: convertCAP_toString(Cap.CapID),
                resizable: true,
                width: "auto",
                maxHeight: 600,
                modal: true,
                buttons: _btn
            });
        } else if (Cap.ConType == TWON_ONEVALUE) {
            if (bReadOnly) {
                alert("This Capability is Read-Only!");
                PrintCMDMessage("Can't Set Read-Only Capability " + convertCAP_toString(Cap.CapID));
                return;
            }
            if (_type == TWTY_BOOL) { // if true, set false, vice versa
                newValue = globalRuntime.CapabilityNegotiation.oneValue == "True" ? 0 : 1;
                twrc = set_CapabilityOneValue(Cap.CapID, newValue, 'number');
                if (twrc) {
                    bChange = true;
                }
                setTimeout(function () {
                    updateTable(bChange, Cap.CapID);
                }, 100);
            } else {
                $("#ValueSelector").html("");
                $("#ValueSelector").append(
                    "<input type='text' style='text-align:left'/>"
                );
                if (_currentValue.indexOf('[0x') != -1) {
                    _currentValue = _currentValue.substr(0, _currentValue.indexOf('[0x') - 1);
                }
                $("#ValueSelector input").val(_currentValue);
                if (Cap.bReadOnly) {
                    $("#ValueSelector input").prop("disabled", "disabled");
                    _btn = {
                        "Close": function () {
                            $("#ValueSelector").html("");
                            $(this).dialog("close");
                        }
                    };
                } else
                    _btn = {
                        "OK": function () {
                            newValue = $.trim($("#ValueSelector input").val());
                            if (_type < 8) { /* number */
                                if (/^\s*$/.test(newValue) || isNaN(newValue)) {
                                    $("#ValueSelector input").focus();
                                    $("#ValueSelector input").addClass("invalid");
                                    return false;
                                }
                            } else if (_type == TWTY_FRAME) {
                                var _frameLRTB = newValue.split(","),
                                    bInvalid = false;
                                if (_frameLRTB.length == 4) {
                                    $.each(_frameLRTB, function (_k, _o) {
                                        if (/^\s*$/.test(_o) || isNaN(_o))
                                            bInvalid = true;
                                        else {
                                            _frameLRTB[_k] = Number(_o);
                                        }
                                    });
                                } else bInvalid = true;
                                if (bInvalid) {
                                    $("#ValueSelector input").focus();
                                    $("#ValueSelector input").addClass("invalid");
                                    return false;
                                }
                            }
                            if (newValue != globalRuntime.CapabilityNegotiation.oneValue) {
                                switch (_type) {
                                    case TWTY_INT8:
                                    case TWTY_INT16:
                                    case TWTY_INT32:
                                    case TWTY_UINT8:
                                    case TWTY_UINT16:
                                    case TWTY_UINT32:
                                    case TWTY_FIX32:
                                        twrc = set_CapabilityOneValue(Cap.CapID, newValue, 'number');
                                        break;
                                    case TWTY_STR32:
                                    case TWTY_STR64:
                                    case TWTY_STR128:
                                    case TWTY_STR255:
                                        twrc = set_CapabilityOneValue(Cap.CapID, newValue, 'string');
                                        break;
                                    case TWTY_FRAME:
                                        twrc = set_CapabilityOneValue(Cap.CapID, newValue, 'frame');
                                        break;
                                    default:
                                        PrintCMDMessage("Setting this data type is not implemented.  Patches welcome.", "Not Implemented");
                                        break;
                                }
                                if (twrc) {
                                    bChange = true;
                                }
                            }
                            $("#ValueSelector").html("");
                            $(this).dialog("close");
                            setTimeout(function () {
                                updateTable(bChange, Cap.CapID);
                            }, 100);
                        },
                        "Close": function () {
                            $("#ValueSelector").html("");
                            $(this).dialog("close");
                        }
                    };
                $("#ValueSelector").dialog({
                    title: convertCAP_toString(Cap.CapID),
                    resizable: true,
                    width: "auto",
                    modal: true,
                    buttons: _btn
                });
            }
        } else if (Cap.ConType == TWON_RANGE) {
            var _title = convertCAP_toString(Cap.CapID);
            $("#ValueSelector").html("");
            $("#ValueSelector").append(
                ["<div style='text-align:center'>",
                    "<span class='rangeCurrent' id='currentValue_", _title, "'>", _values[0].value, "</span><br />",
                    "<span>", _values[0].min, "</span>", "<input type = 'range' min = '",
                    _values[0].min, "' max='", _values[0].max, "' step='",
                    _values[0].step, "' value='", _values[0].value, "'/>",
                    "<span>", _values[0].max, "</span><br /></div>"
                ].join("")
            );
            $("#ValueSelector input").off('change').on('input', function (evt) {
                globalRuntime.CapabilityNegotiation.rangeCurrentValue = evt.originalEvent.target.value;
                $("#ValueSelector .rangeCurrent").html(evt.originalEvent.target.value);
            });
            if (Cap.bReadOnly) {
                $("#ValueSelector input").prop("disabled", "disabled");
                _btn = {
                    "Close": function () {
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                    }
                };
            } else _btn = {
                "OK": function () {
                    newValue = globalRuntime.CapabilityNegotiation.rangeCurrentValue;
                    if (_values[0].value != globalRuntime.CapabilityNegotiation.rangeCurrentValue) {
                        switch (_type) {
                            case TWTY_INT8:
                            case TWTY_INT16:
                            case TWTY_INT32:
                            case TWTY_UINT8:
                            case TWTY_UINT16:
                            case TWTY_UINT32:
                            case TWTY_FIX32:
                                twrc = set_CapabilityRange(Cap.CapID, newValue);
                                break;
                            default:
                                PrintCMDMessage("Setting this data type is not implemented.  Patches welcome.", "Not Implemented");
                                break;
                        }
                        if (twrc) {
                            bChange = true;
                        }
                    }
                    $("#ValueSelector").html("");
                    $(this).dialog("close");
                    setTimeout(function () {
                        updateTable(bChange, Cap.CapID);
                    }, 100);
                },
                "Cancle": function () {
                    $("#ValueSelector").html("");
                    $(this).dialog("close");
                }
            };
            $("#ValueSelector").dialog({
                title: _title,
                resizable: true,
                width: 300,
                height: "auto",
                modal: true,
                buttons: _btn
            });
        } else if (Cap.ConType == TWON_ARRAY) {
            _valueList = [];
            _valueItemClass = "ui-state-default";
            for (_val in _values) {
                _valueList.push("<li class='" + _valueItemClass + "'>" + _values[_val] + "</li >");
            }
            $("#ValueSelector").html("");
            $("#ValueSelector").append(
                "<ul id='sortableArrayValues' style='text-align:left'>" + _valueList.join("") +
                "</ul>"
            );
            $("#sortableArrayValues").sortable();
            $("#sortableArrayValues").disableSelection();
            $.contextMenu('destroy', '#sortableArrayValues li');
            $.contextMenu({
                selector: '#sortableArrayValues li',
                callback: function (key, options) {
                    switch (key) {
                        case "delete":
                            $(this).remove();
                            break;
                        case "add":
                            $("#sortableArrayValues").append("<li class='" + _valueItemClass + "'><input id='sortableArrayValues_new' style='width:90%' type='text'></li >");
                            $("#sortableArrayValues_new").focus();
                            $("#sortableArrayValues_new").off('blur').on('blur', function () {
                                $("#sortableArrayValues_new").focus();
                            });

                            $("#sortableArrayValues_new").off('keypress').on('keypress', function (event) {
                                if (event.which == 13) {
                                    event.preventDefault();
                                    newValue = $.trim($("#sortableArrayValues_new").val());

                                    if (newValue != "") {
                                        if (_type < 8) { /* number */
                                            if (!/^\s*$/.test(newValue) && !isNaN(newValue))
                                                $("#sortableArrayValues li:last").html(newValue);
                                            else {
                                                $("#sortableArrayValues_new").focus();
                                                $("#sortableArrayValues_new").addClass("invalid");
                                            }
                                        } else
                                            $("#sortableArrayValues li:last").html(newValue);
                                    } else
                                        $("#sortableArrayValues li:last").remove();
                                }
                            });
                    }
                },
                items: {
                    "add": {
                        name: "Add",
                        icon: "add"
                    },
                    "delete": {
                        name: "Delete",
                        icon: "delete"
                    },
                    "sep1": "---------",
                    "quit": {
                        name: "Quit",
                        icon: function ($element, key, item) {
                            return 'context-menu-icon context-menu-icon-quit';
                        }
                    }
                }
            });
            if (Cap.bReadOnly) {
                //$.contextMenu('destroy', '#sortableArrayValues li');
                _btn = {
                    "Close": function () {
                        $("#ValueSelector").html("");
                        $(this).dialog("close");
                    }
                };
            } else _btn = {
                "OK": function () {
                    var _newValues = [],
                        bValueChanged = false;
                    $.each($("#sortableArrayValues li"), function (key, _item) {
                        _newValues.push($(_item).html());
                    });
                    if (_newValues.length != _values.length) bValueChanged = true;
                    else {
                        for (i = 0; i < _newValues.length; i++) {
                            if (_newValues[i] != _values[i].toString()) {
                                bValueChanged = true;
                                break;
                            }
                        }
                    }
                    if (bValueChanged) {
                        switch (_type) {
                            case TWTY_INT8:
                            case TWTY_INT16:
                            case TWTY_INT32:
                            case TWTY_UINT8:
                            case TWTY_UINT16:
                            case TWTY_UINT32:
                            case TWTY_BOOL:
                            case TWTY_FIX32:
                                twrc = set_CapabilityArray(Cap.CapID, _newValues, 'number');
                                break;
                            case TWTY_STR32:
                            case TWTY_STR64:
                            case TWTY_STR128:
                            case TWTY_STR255:
                                twrc = set_CapabilityArray(Cap.CapID, _newValues, 'string');
                                break;
                            default:
                                PrintCMDMessage("Setting this data type is not implemented.  Patches welcome.", "Not Implemented");
                                break;
                        }
                        if (twrc) {
                            bChange = true;
                        }
                    }
                    $("#ValueSelector").html("");
                    $(this).dialog("close");
                    setTimeout(function () {
                        updateTable(bChange, Cap.CapID);
                    }, 100);
                },
                "Close": function () {
                    $("#ValueSelector").html("");
                    $(this).dialog("close");
                }
            };
            $("#ValueSelector").dialog({
                title: convertCAP_toString(Cap.CapID),
                resizable: true,
                width: 300,
                minHeight: 100 + 50 * (_values.length + 1),
                maxHeight: 800,
                modal: true,
                buttons: _btn
            });
        } else {
            PrintCMDMessage("Unknown Capability Type, unable to Set this Capability!");
        }
    } else {
        PrintCMDMessage("Unable to Set this Capability!");
    }
}

function set_CapabilityArray(Cap, _aryValues, _type) {
    if (DWObject) {
        DWObject.Capability = Cap;
        DWObject.CapGet();
        DWObject.CapNumItems = _aryValues.length;
        for (var i = 0; i < _aryValues.length; i++) {
            switch (_type) {
                case 'number':
                    DWObject.SetCapItems(i, Number(_aryValues[i]));
                    break;
                case 'string':
                    DWObject.SetCapItemsString(i, _aryValues[i]);
                    break;
            }
        }
        PrintCMDMessage("Setting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapSet()) {
            PrintCMDMessage("Setting Capability Succeeded");
            return true;
        } else {
            printError("Failed to set the capability");
            return false;
        }
    }
}

function set_CapabilityEnumeration(Cap, _value, _index, _objVerify) {
    if (DWObject) {
        DWObject.Capability = Cap;
        DWObject.CapGet();
        //console.log(convertCAP_Item_toString(Cap, DWObject.GetCapItems(DWObject.CapCurrentIndex), DWObject.CapValueType));
        DWObject.CapCurrentIndex = _index;
        PrintCMDMessage("Setting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapSet()) {
            DWObject.CapGet();
            _objVerify.valueAfterSet = DWObject.GetCapItems(DWObject.CapCurrentIndex);
            //console.log(convertCAP_Item_toString(Cap, DWObject.GetCapItems(DWObject.CapCurrentIndex), DWObject.CapValueType));
            return true;
        } else {
            printError("Failed to set the capability");
            return false;
        }
    }
}

function set_CapabilityRange(Cap, _value) {
    if (DWObject) {
        DWObject.Capability = Cap;
        DWObject.CapGet();
        DWObject.CapCurrentValue = _value;
        PrintCMDMessage("Setting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapSet()) {
            PrintCMDMessage("Setting Capability Succeeded");
            return true;
        } else {
            printError("Failed to set the capability");
            return false;
        }
    }
}

function set_CapabilityOneValue(Cap, _value, _type) {
    if (DWObject) {
        DWObject.Capability = Cap;
        DWObject.CapGet();
        switch (_type) {
            case 'number':
                DWObject.CapValue = _value;
                DWObject.CapType = TWON_ONEVALUE;
                break;
            case 'string':
                DWObject.CapValueString = _value;
                DWObject.CapType = TWON_ONEVALUE;
                break;
            case 'frame':
                DWObject.CapSetFrame(0, _value[0], _value[2], _value[1], _value[3]);
                break;
            default:
        }
        PrintCMDMessage("Setting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapSet()) {
            PrintCMDMessage("Setting Capability Succeeded");
            return true;
        } else {
            printError("Failed to set the capability");
            return false;
        }
    }
}

function getCapability(Cap) {
    if (DWObject) {
        DWObject.Capability = Cap;
        PrintCMDMessage("Getting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapGet()) {
            PrintCMDMessage("Getting Capability Succeeded");
            PopulateCurentValues(true, Cap);
        } else {
            PrintCMDMessage("Failed to Get" + convertCAP_toString(Cap));
        }
    }
}

function resetCapability(Cap) {
    if (DWObject) {
        DWObject.Capability = Cap;
        PrintCMDMessage("Resetting Capability " + convertCAP_toString(Cap) + "...");
        if (DWObject.CapReset()) {
            PrintCMDMessage("Resetting Capability Succeeded");
            PopulateCurentValues(true, Cap);
        } else {
            PrintCMDMessage("Failed to Reset" + convertCAP_toString(Cap));
        }
    }
}
//////////////////////////////////////////////////////////////////////////////

function PrintCMDMessage(txt, type) {
    var _date = new Date(),
        objDiv = document.getElementById('status_text');
    objDiv.innerHTML += _date.toLocaleDateString() + ' ' + _date.toLocaleTimeString() + '<br />';
    if (type == 1) {
        textStatus = '<span style="color:#cE5E04"><strong>' + txt + '</strong></span><br />';
    } else {
        textStatus = txt + "<br />";
    }
    objDiv.innerHTML += textStatus;
    console.log(txt);
    if (type == 'popup')
        alert(txt);
    objDiv.scrollTop = objDiv.scrollHeight;
}

function printError(txt) {
    PrintCMDMessage(txt, true);
    if (DWObject) {
        textStatus = "An error has occurred. The error is " + DWObject.ErrorString;
        PrintCMDMessage(textStatus, 'popup');
    }
}

function clearInfo() {
    document.getElementById('status_text').innerHTML = "";
    textStatus = "";
}

function AcquireImage() {
    if (DWObject) {
        if (m_DSMState < 4) {
            PrintCMDMessage("No Source is Open for Acquiring!");
        } else {
            var OnAcquireImageSuccess, OnAcquireImageFailure;
            OnAcquireImageSuccess = function () {
                PrintCMDMessage('Scan Succeeded!');
                if (globalRuntime.bViewerDocked) return;
                $("#DWTContainer").dialog({
                    dialogClass: 'noTitleStuff',
                    resizable: false,
                    height: 620,
                    width: 980,
                    modal: true,
                    buttons: {
                        "Dock": function () {
                            globalRuntime.bViewerDocked = true;
                            $("#DWTContainer").dialog("destroy");
                            DWObject.Width = 980;
                            $("#DWTContainer").show();
                            $("#DWTContainer").focus();
                        },
                        "Close": function () {
                            $(this).dialog("close");
                        }
                    }
                });
            };
            OnAcquireImageFailure = function () {
                PrintCMDMessage('Scan Failed!', 'popup');
            };
            DWObject.AcquireImage(OnAcquireImageSuccess, OnAcquireImageFailure);
        }
    }
}

$(function () {
    $.contextMenu({
        selector: '#tblCAPList',
        build: function ($trigger, evt) {
            // this callback is executed every time the menu is to be shown
            // its results are destroyed every time the menu is hidden
            // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
            var _items = {
                "sort": {
                    name: "Enable Sorting",
                    icon: "sort"
                },
                "reset": {
                    name: "Reset Sorting",
                    icon: "delete"
                },
                "refreshAll": {
                    name: "Refresh All",
                    icon: "delete"
                },
                "sep2": "---------",
                "quit": {
                    name: "Quit",
                    icon: function ($element, key, item) {
                        return 'context-menu-icon context-menu-icon-quit';
                    }
                }
            };
            if (DWObject) {
                var strIDOfSelector = $(evt.target).parent().attr('id');
                if (strIDOfSelector && strIDOfSelector.indexOf("CAP_") != -1) {
                    globalRuntime.nCurrentCAPId = Number(strIDOfSelector.substr(4));
                    $(strIDOfSelector).addClass("over");
                    var _newItems = {},
                        bEmpty = true;
                    if (m_pCapSettings[strIDOfSelector].OperationType & TWQC_GET) {
                        _newItems.getCap = {
                            name: "Get " + convertCAP_toString(globalRuntime.nCurrentCAPId),
                            icon: "get"
                        };
                        bEmpty = false;
                    }
                    if (m_pCapSettings[strIDOfSelector].OperationType & TWQC_SET) {
                        _newItems.setCap = {
                            name: "Set " + convertCAP_toString(globalRuntime.nCurrentCAPId),
                            icon: "set"
                        };
                        bEmpty = false;
                    }
                    if (m_pCapSettings[strIDOfSelector].InitialValue != m_pCapSettings[strIDOfSelector].CurrentValue &&
                        (m_pCapSettings[strIDOfSelector].OperationType & TWQC_RESET)) {
                        _newItems.resetCap = {
                            name: "Reset " + convertCAP_toString(globalRuntime.nCurrentCAPId),
                            icon: "reset"
                        };
                        bEmpty = false;
                    }
                    if (bEmpty == false)
                        _newItems = $.extend(_newItems, {
                            "sep1": "---------"
                        });
                    _items = $.extend(_newItems, _items);
                }
            }

            return {
                callback: function (key, options) {
                    switch (key) {
                        case "getCap":
                            getCapability(globalRuntime.nCurrentCAPId);
                            break;
                        case "setCap":
                            OnNMDblclkCaps(globalRuntime.nCurrentCAPId);
                            break;
                        case "resetCap":
                            resetCapability(globalRuntime.nCurrentCAPId);
                            break;
                        case "sort":
                            if (!$("#tblCAPList")[0].hasInitialized)
                                $("#tblCAPList").tablesorter({
                                    cssAsc: "sortUp",
                                    cssDesc: "sortDown",
                                    widgets: ["zebra"]
                                });
                            break;
                        case "reset":
                            $.tablesorter.destroy($("#tblCAPList"), true, function () { });
                            $("#tblCAPList").tablesorter({
                                sortList: [
                                    [6, 0]
                                ],
                                cssAsc: "sortUp",
                                cssDesc: "sortDown",
                                widgets: ["zebra"]
                            });
                            break;
                        case "refreshAll":
                            Dynamsoft.Lib.showMask();
                            setTimeout(function () {
                                PopulateCurentValues(false);
                                Dynamsoft.Lib.hideMask();
                            }, 100);
                            break;
                    }
                },
                items: _items
            };
        }
    });
});

function addContextMenuToDWTViewer() {
    $.contextMenu({
        selector: '#' + Dynamsoft.WebTwainEnv.Containers[0].ContainerId,
        build: function ($trigger, evt) {
            if (DWObject) {
                var _newIndex = Number($(evt.target).parent().parent().children().text()) - 1;
                if (DWObject.CurrentImageIndexInBuffer != _newIndex)
                    setTimeout(function () {
                        DWObject.CurrentImageIndexInBuffer = _newIndex;
                    }, 0);
            }
            return {
                callback: function (key, options) {
                    switch (key) {
                        case "remove":
                            if (DWObject)
                                DWObject.RemoveImage(DWObject.CurrentImageIndexInBuffer);
                            break;
                        case "removeAll":
                            if (DWObject)
                                DWObject.RemoveAllImages();
                            break;
                        case "fold1-key1":
                            if (DWObject)
                                DWObject.SetViewMode(2, 1);
                            break;
                        case "fold1-key2":
                            if (DWObject)
                                DWObject.SetViewMode(4, 2);
                            break;
                        case "fold1-key3":
                            if (DWObject)
                                DWObject.SetViewMode(6, 3);
                            break;
                    }
                },
                items: {
                    "remove": {
                        name: "Remove",
                        icon: "delete"
                    },
                    "removeAll": {
                        name: "Remove All",
                        icon: "delete"
                    },
                    "sep1": "---------",
                    "fold1": {
                        "name": "View Mode",
                        "items": {
                            "fold1-key1": {
                                "name": "2 X 1"
                            },
                            "fold1-key2": {
                                "name": "4 X 2"
                            },
                            "fold1-key3": {
                                "name": "6 X 3"
                            }
                        }
                    },
                    "sep2": "---------",
                    "quit": {
                        name: "Quit",
                        icon: function ($element, key, item) {
                            return 'context-menu-icon context-menu-icon-quit';
                        }
                    }
                }
            };
        }
    });
}

function saveInfo() {
    if (DWObject) {
        var currentScriptPath;
        if (document.currentScript)
            currentScriptPath = document.currentScript.src;
        else {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                if (scripts[i].src && scripts[i].src.indexOf('twainapp.js') != -1) {
                    currentScriptPath = scripts[i].src;
                    break;
                }
            }
        }
        var url = currentScriptPath.substr(0, currentScriptPath.lastIndexOf('/Scripts') + 1) + "saveInfo.aspx";
        DWObject.IfShowCancelDialogWhenImageTransfer = false;
        DWObject.ClearAllHTTPFormField();
        DWObject.SetHTTPFormField('timestamp', new Date().getTime());
        DWObject.SetHTTPFormField('infoToSave', JSON.stringify(m_pCapSettings));
        DWObject.HTTPUpload(url, function () { }, function (erroCode, errorString) {
            PrintCMDMessage(errorString);
        });
    }
}