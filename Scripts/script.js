
var supportedCapabilities, msgType, ctnType, txtReturnedOrToSet, textStatus = "";
var CurrentPathName = unescape(location.pathname);
var CurrentPath = CurrentPathName.substring(0, CurrentPathName.lastIndexOf("/") + 1);
var strHTTPServer = location.hostname;
var strActionPage;
var DynamsoftCapabilityNegotiation = {
    CurrentCapabilityHasBoolValue: false,
    tempFrame: '',
    tmpType: 0
};




var dsData = '',
    backupData = '';



//////////////////////////////////////////////////////////////////////////////


function GetCustomData() {
    DWObject.SelectSource();
    DWObject.CloseSource();
    DWObject.OpenSource();
    DWObject.IfShowUI = true;
    var OnAcquireImageSuccess, OnAcquireImageFailure;
    OnAcquireImageSuccess = function () {
        dsData = DWObject.GetCustomDSDataEx();
        DWObject.CloseSource();
        console.log('GetCustomDataEx Succeeded!');
    };
    OnAcquireImageFailure = function () {
        DWObject.CloseSource();
        alert('Scan Failed!' + DWObject.ErrorString);
    };
    DWObject.AcquireImage(OnAcquireImageSuccess, OnAcquireImageFailure);
}

function AcquireImage() {
    if (DWObject.DataSourceStatus != 1) {
        DWObject.SelectSourceByIndex(document.getElementById('source').value);
        DWObject.OpenSource();
    } else {
        var sel = document.getElementById('source');
        var num = parseInt(sel.value) + 1;
        if (sel.options[num].text != DWObject.CurrentSourceName) {
            DWObject.SelectSourceByIndex(document.getElementById('source').value);
            DWObject.OpenSource();
        }
    }
    var OnAcquireImageSuccess, OnAcquireImageFailure;
    OnAcquireImageSuccess = function () {
        DWObject.CloseSource();
        console.log('Scan Succeeded!');
    };
    OnAcquireImageFailure = function () {
        DWObject.CloseSource();
        alert('Scan Failed!');
    };
    DWObject.AcquireImage(OnAcquireImageSuccess, OnAcquireImageFailure);
}

function CheckCustomData() {
    if (dsData != '') {
        var oParser = new DOMParser(),
            strDSData = atob(dsData);
        backupData = dsData;
        dsData = '';
        strDSData = oParser.parseFromString(strDSData, "application/xml");
        if (strDSData.documentElement.nodeName != "parsererror") {
            for (var i = 0; i < strDSData.documentElement.children.length; i++) {
                var oChild = strDSData.documentElement.children[i];
                switch (oChild.nodeName) {
                    case "version":
                        console.log('Version: ' + oChild.innerHTML);
                        break;
                    case "scanner":
                        console.log('Scanner Name: ' + oChild.innerHTML);
                        break;
                    case "capability":
                        for (var j = 0; j < oChild.children.length; j++) {
                            var oGrandChild = oChild.children[j];
                            switch (oGrandChild.nodeName) {
                                case 'name':
                                    var bNameNotFound = true;
                                    for (var key in Capabilities_2018Aug) {
                                        if (Capabilities_2018Aug.hasOwnProperty(key)) {
                                            if (parseInt(oGrandChild.innerHTML) == parseInt(key)) {
                                                console.log('Capability Name: ' + Capabilities_2018Aug[key] + ' CapHex: ' + key + ' CapCodeInDecimal: ' + parseInt(key));
                                                bNameNotFound = false;
                                            }
                                        }
                                    }
                                    if (bNameNotFound) {
                                        var hex = Number(parseInt(oGrandChild.innerHTML)).toString(16);
                                        hex = "0x0000".substr(0, 6 - hex.length) + hex;
                                        console.log('Capability Name: Custom Capability' + ' CapHex: ' + hex + ' CapCodeInDecimal: ' + parseInt(hex));
                                    }
                                    break;
                                case 'containerType':
                                    for (var key2 in EnumDWT_CapType) {
                                        if (EnumDWT_CapType.hasOwnProperty(key2)) {
                                            if (parseInt(oGrandChild.innerHTML) == EnumDWT_CapType[key2])
                                                console.log("Capability Type: " + key2);
                                        }
                                    }
                                    break;
                                case 'valueType':
                                    console.log("Value Type: " + STR_CapValueType[parseInt(oGrandChild.innerHTML)]);
                                    break;
                                case 'value':
                                    console.log('Value: ' + oGrandChild.innerHTML);
                                    break;
                                default:
                                    console.log(oGrandChild.innerHTML);
                            }
                        }
                        break;
                    default:
                        console.log('Other Info: ' + oChild);
                }

            }
        }
    }
}

function ListSupportedCaps() {
    if (get_CAP(EnumDWT_Cap.CAP_SUPPORTEDCAPS, MSG_GET)) {

        supportedCapabilities.options.selectedIndex = 0;
    }



    function PopulateCurentValues(bCheckForChange) {
        if (!DWObject) return;
        var nItem, nCount = $('tr').length;

        for (nItem = 0; nItem < nCount; nItem++) {
            if (get_CAP(parseInt($("tr")[nItem].id.substr(4)), MSG_GET)) {
                var type = DWObject.CapValueType,
                    ConType = DWObject.CapType;
                switch (type) {
                    case TWTY_INT8:
                    case TWTY_UINT8:
                    case TWTY_INT16:
                    case TWTY_UINT16:
                    case TWTY_INT32:
                    case TWTY_UINT32:
                    case TWTY_BOOL:
                        {
                            if (ConType == TWON_ARRAY) {
                                var uVal, uCount = 0;
                                sItemValue = "";
                                while (GetItem( & Cap, uCount, uVal)) {
                                    if (sItemValue.length() != 0)
                                        sItemValue += ", ";
                                    sItemValue += convertCAP_Item_toString(Cap.Cap, uVal, type);
                                    uCount++;
                                }
                            } else {
                                TW_UINT32 uVal;
                                getCurrent( & Cap, uVal);
                                sItemValue = convertCAP_Item_toString(Cap.Cap, uVal, type);
                            }
                            break;
                        }

                    case TWTY_STR32:
                    case TWTY_STR64:
                    case TWTY_STR128:
                    case TWTY_STR255:
                        {
                            if (Cap.ConType == TWON_ARRAY) {
                                string sVal;
                                TW_UINT32 uCount = 0;
                                sItemValue = "";
                                while (GetItem( & Cap, uCount, sVal)) {
                                    if (sItemValue.length() != 0)
                                        sItemValue += ", ";
                                    sItemValue += sVal;
                                    uCount++;
                                }
                            } else {
                                getCurrent( & Cap, sItemValue);
                            }
                            break;
                        }

                    case TWTY_FIX32:
                        {
                            TW_FIX32 fix32;
                            CString value;

                            if (Cap.ConType == TWON_ARRAY) {
                                TW_UINT32 uCount = 0;
                                sItemValue = "";
                                while (GetItem( & Cap, uCount, fix32)) {
                                    if (sItemValue.length() != 0)
                                        sItemValue += ", ";
                                    value.Format("%d.%d", fix32.Whole, (int)((fix32.Frac / 65536.0 + .0005) * 1000));
                                    sItemValue = value;
                                    uCount++;
                                }
                            } else {
                                getCurrent( & Cap, fix32);
                                value.Format("%d.%d", fix32.Whole, (int)((fix32.Frac / 65536.0 + .0005) * 1000));
                                sItemValue = value;
                            }
                            break;
                        }

                    case TWTY_FRAME:
                        {
                            TW_FRAME frame;
                            CString value;

                            if (Cap.ConType == TWON_ARRAY) {
                                TW_UINT32 uCount = 0;
                                sItemValue = "";
                                while (GetItem( & Cap, uCount, frame)) {
                                    if (sItemValue.length() != 0)
                                        sItemValue += ", ";
                                    value.Format("%d.%d  %d.%d  %d.%d  %d.%d",
                                        frame.Left.Whole, (int)((frame.Left.Frac / 65536.0 + .0005) * 1000),
                                        frame.Right.Whole, (int)((frame.Right.Frac / 65536.0 + .0005) * 1000),
                                        frame.Top.Whole, (int)((frame.Top.Frac / 65536.0 + .0005) * 1000),
                                        frame.Bottom.Whole, (int)((frame.Bottom.Frac / 65536.0 + .0005) * 1000));
                                    sItemValue = value;
                                    uCount++;
                                }
                            } else {
                                getCurrent( & Cap, frame);
                                value.Format("%d.%d  %d.%d  %d.%d  %d.%d",
                                    frame.Left.Whole, (int)((frame.Left.Frac / 65536.0 + .0005) * 1000),
                                    frame.Right.Whole, (int)((frame.Right.Frac / 65536.0 + .0005) * 1000),
                                    frame.Top.Whole, (int)((frame.Top.Frac / 65536.0 + .0005) * 1000),
                                    frame.Bottom.Whole, (int)((frame.Bottom.Frac / 65536.0 + .0005) * 1000));
                                sItemValue = value;
                            }
                            break;
                        }
                    default:
                        {
                            sItemValue = "?";
                            break;
                        }
                }
            } else //if(Cap.hContainer)
            {
                sItemValue = "<<Invalid Container>>";
            }
        } else {
            CString sError;
            sError.Format("<<%s>>", convertConditionCode_toString(CondCode));
            sItemValue = sError;
        }

        // Get the current test to see if it has changed.
        if (bCheckForChange) {
            char oldString[260];
            Item.cchTextMax = 260;
            Item.iSubItem = 1;
            Item.pszText = oldString;
            m_ListCtrl_Caps.GetItem( & Item);
            if (0 != strncmp(sItemValue.c_str(), oldString, 259)) {
                byChanged |= 1 << Item.iSubItem;
            }
        }

        Item.iSubItem = 1;
        Item.pszText = (char * ) sItemValue.c_str();
        m_ListCtrl_Caps.SetItem( & Item);

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

        // Get the current test to see if it has changed.
        if (bCheckForChange) {
            char oldString[260];
            Item.cchTextMax = 260;
            Item.iSubItem = 2;
            Item.pszText = oldString;
            m_ListCtrl_Caps.GetItem( & Item);
            if (0 != strcmp(sItemValue.c_str(), oldString)) {
                byChanged |= 1 << Item.iSubItem;
            }
        }

        Item.iSubItem = 2;
        Item.pszText = (char * ) sItemValue.c_str();
        m_ListCtrl_Caps.SetItem( & Item);
        TW_UINT32 nNumItems = 0;

        if (Cap.ConType == TWON_ARRAY ||
            Cap.ConType == TWON_ENUMERATION) {
            pTW_ARRAY pCap = (pTW_ARRAY) _DSM_LockMemory(Cap.hContainer);
            if (pCap) {
                nNumItems = pCap - > NumItems;
                _DSM_UnlockMemory(Cap.hContainer);
            }

            CString Value;
            Value.Format("%d", nNumItems);
            sItemValue = Value;

            // Get the current test to see if it has changed.
            if (bCheckForChange) {
                char oldString[260];
                Item.cchTextMax = 260;
                Item.iSubItem = 3;
                Item.pszText = oldString;
                m_ListCtrl_Caps.GetItem( & Item);
                if (0 != strcmp(sItemValue.c_str(), oldString)) {
                    byChanged |= 1 << Item.iSubItem;
                }
            }

            Item.iSubItem = 3;
            Item.pszText = (char * ) sItemValue.c_str();
            m_ListCtrl_Caps.SetItem( & Item);
        }

        QuerySupport_CAP(Cap.Cap, QS);

        sItemValue = "";
        if (QS & (TWQC_GET | TWQC_GETDEFAULT | TWQC_GETCURRENT)) {
            sItemValue += "Get";
        }
        if (QS & TWQC_SET) {
            if (0 != sItemValue.length())
                sItemValue += ", ";
            sItemValue += "Set";
        }
        if (QS & TWQC_RESET) {
            if (0 != sItemValue.length())
                sItemValue += ", ";
            sItemValue += "Reset";
        }

        // Get the current test to see if it has changed.
        if (bCheckForChange) {
            char oldString[260];
            Item.cchTextMax = 260;
            Item.iSubItem = 4;
            Item.pszText = oldString;
            m_ListCtrl_Caps.GetItem( & Item);
            if (0 != strcmp(sItemValue.c_str(), oldString)) {
                byChanged |= 1 << Item.iSubItem;
            }
        }

        Item.iSubItem = 4;
        Item.pszText = (char * ) sItemValue.c_str();
        m_ListCtrl_Caps.SetItem( & Item);

        if ((Cap.ConType == TWON_ENUMERATION && nNumItems <= 1) ||
            !(QS & TWQC_SET)) {
            bReadOnly = TRUE;
        }

        pCapSetting - > byChanged = (TW_UINT8) byChanged;
        pCapSetting - > bReadOnly = (TW_UINT8) bReadOnly;
    }
    m_bBusy = false;
    UpdateButtons();
    m_ListCtrl_Caps.Invalidate(FALSE);* /
}

function getcap() {
    var i;
    /*msgType.selectedIndex = 1;
    changeByMesageType();
    clearInfo();*/
    if (DWObject.DataSourceStatus != 1) {
        DWObject.SelectSourceByIndex(document.getElementById('source').value);
        DWObject.SetOpenSourceTimeout(2000);
        DWObject.OpenSource();
    }
    if (typeof (_capability) != "undefined")
        DWObject.Capability = _capability;
    else
        DWObject.Capability = parseInt(supportedCapabilities.value);
    console.log('-------------------------------------');
    console.log('%cCapability Name: ' + Capabilities_2018Aug['0x' + (parseInt(supportedCapabilities.value).toString(16)).toUpperCase()], "color:blue");
    DWObject.CapGet();
    txtReturnedOrToSet.value = DWObject.ErrorString;
    DynamsoftCapabilityNegotiation.tmpType = DWObject.CapType;
    ctnType.selectedIndex = 5;
    if (DynamsoftCapabilityNegotiation.tmpType > 2 && DynamsoftCapabilityNegotiation.tmpType < 7)
        ctnType.selectedIndex = DynamsoftCapabilityNegotiation.tmpType - 2;
    console.log('%cCapType is:' + ctnType.selectedOptions[0].innerHTML, "color:red");
    document.getElementById('availableValuesSPAN').style.display = 'none';
    DynamsoftCapabilityNegotiation.CurrentCapabilityHasBoolValue = false;
    switch (DynamsoftCapabilityNegotiation.tmpType) {
        case EnumDWT_CapType.TWON_ARRAY /*3*/:
            document.getElementById('availableValuesSPAN').style.display = '';
            document.getElementById('availableValues').options.length = 1;
            console.log("%cavailableValues:", "font:bold");
            for (i = 0; i < DWObject.CapNumItems; i++) {
                if (DWObject.CapValueType > 8) { /* >8 is string*/
                    /*STR*/
                    document.getElementById('availableValues').options.add(new Option(DWObject.GetCapItemsString(i), DWObject.GetCapItemsString(i)));
                    console.log(DWObject.GetCapItemsString(i));
                } else {
                    /*NUM*/
                    document.getElementById('availableValues').options.add(new Option(DWObject.GetCapItems(i), DWObject.GetCapItems(i)));
                    console.log(DWObject.GetCapItems(i));
                }
            }
            document.getElementById('availableValues').options.selectedIndex = 0;
            break;
        case EnumDWT_CapType.TWON_ENUMERATION /*4*/:
            document.getElementById('availableValuesSPAN').style.display = '';
            document.getElementById('availableValues').options.length = 1;
            console.log("%cavailableValues:", "font:bold");
            if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.ICAP_FRAMES) {
                PrintCMDMessage('Special Capability ' + '- ICAP_FRAMES');
                for (i = 0; i < DWObject.CapNumItems; i++) {
                    DynamsoftCapabilityNegotiation.tempFrame = DWObject.CapGetFrameLeft(i) + " " + DWObject.CapGetFrameTop(i) + " " + DWObject.CapGetFrameRight(i) + " " + DWObject.CapGetFrameBottom(i);
                    console.log(DynamsoftCapabilityNegotiation.tempFrame);
                    document.getElementById('availableValues').options.add(new Option(DynamsoftCapabilityNegotiation.tempFrame, DynamsoftCapabilityNegotiation.tempFrame));
                }
                document.getElementById('availableValues').options.selectedIndex = 0;
            } else {
                for (i = 0; i < DWObject.CapNumItems; i++) {
                    if (DWObject.CapValueType > 8) { /* >8 is string*/
                        /*STR*/
                        document.getElementById('availableValues').options.add(new Option(DWObject.GetCapItemsString(i), DWObject.GetCapItemsString(i)));
                        console.log(DWObject.GetCapItemsString(i));
                    } else {
                        /*NUM*/
                        document.getElementById('availableValues').options.add(new Option(DWObject.GetCapItems(i), DWObject.GetCapItems(i)));
                        console.log(DWObject.GetCapItems(i));
                    }
                }
                _showMeaningfulInfo(supportedCapabilities.value);
                if (DWObject.CapValueType > 8) {
                    PrintCMDMessage('Current Index = ' + DWObject.CapCurrentIndex + ' (Value: ' + DWObject.GetCapItemsString(DWObject.CapCurrentIndex) + ')', true);
                    PrintCMDMessage('Default Index = ' + DWObject.CapDefaultIndex + ' (Value: ' + DWObject.GetCapItemsString(DWObject.CapDefaultIndex) + ')', true);
                } else {
                    PrintCMDMessage('Current Index = ' + DWObject.CapCurrentIndex + ' (Value: ' + DWObject.GetCapItems(DWObject.CapCurrentIndex) + ')', true);
                    PrintCMDMessage('Default Index = ' + DWObject.CapDefaultIndex + ' (Value: ' + DWObject.GetCapItems(DWObject.CapDefaultIndex) + ')', true);
                }
            }
            break;
        case EnumDWT_CapType.TWON_ONEVALUE /*5*/:
            var tempValue = '';
            if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.ICAP_FRAMES) {
                PrintCMDMessage('Special Capability ' + '- ICAP_FRAMES', true);
                DynamsoftCapabilityNegotiation.tempFrame = DWObject.CapGetFrameLeft(0) + " " + DWObject.CapGetFrameTop(0) + " " + DWObject.CapGetFrameRight(0) + " " + DWObject.CapGetFrameBottom(0);
                PrintCMDMessage('There is only one available Frame: ', false);
                PrintCMDMessage(DynamsoftCapabilityNegotiation.tempFrame, true);
            } else {
                if (DWObject.CapValueType > 8)
                    /*STR*/
                    tempValue = DWObject.CapValueString;
                else
                    /*NUM*/
                    tempValue = DWObject.CapValue;
                /*
                 * Special for BOOL
                 */
                if (DWObject.CapValueType == EnumDWT_CapValueType.TWTY_BOOL) {
                    DynamsoftCapabilityNegotiation.CurrentCapabilityHasBoolValue = true;
                    if (tempValue == 0) tempValue = 'FALSE';
                    else tempValue = 'TRUE';
                }
                /*
                 * Special for DUPLEX
                 */
                if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.CAP_DUPLEX) tempValue = STR_DuplexValue[tempValue];
                PrintCMDMessage('ItemType = ' + STR_CapValueType[DWObject.CapValueType], true);
                PrintCMDMessage('Value = ' + tempValue, true);
            }
            break;
        case EnumDWT_CapType.TWON_RANGE /*6*/:
            PrintCMDMessage('ItemType = ' + STR_CapValueType[DWObject.CapValueType], true);
            PrintCMDMessage('Min = ' + DWObject.CapMinValue, true);
            PrintCMDMessage('Max = ' + DWObject.CapMaxValue, true);
            PrintCMDMessage('StepSize = ' + DWObject.CapStepSize, true);
            PrintCMDMessage('Default = ' + DWObject.CapDefaultValue, true);
            PrintCMDMessage('Current = ' + DWObject.CapCurrentValue, true);
            break;
        default:
            console.log('This Capability is not supported');
    }
    var supportLevel = [];
    if (DWObject.CapIfSupported(EnumDWT_MessageType.TWQC_GET)) supportLevel.push('GET'); /*TWQC_GET*/
    if (DWObject.CapIfSupported(EnumDWT_MessageType.TWQC_SET)) supportLevel.push('SET'); /*TWQC_SET*/
    if (DWObject.CapIfSupported(EnumDWT_MessageType.TWQC_RESET)) supportLevel.push('RESET'); /*TWQC_RESET*/
    if (supportLevel.length > 0) {
        PrintCMDMessage('Supported operations: ', false);
        PrintCMDMessage(supportLevel.join(' / '), true);
    }
}

function setCapability() {
    var tempValue = '',
        i, valueToShow;
    clearInfo();
    if (DWObject.DataSourceStatus != 1) {
        DWObject.SelectSourceByIndex(document.getElementById('source').value);
        DWObject.SetOpenSourceTimeout(2000);
        DWObject.OpenSource();
    }
    DWObject.Capability = parseInt(supportedCapabilities.value);
    DWObject.CapGet();
    DynamsoftCapabilityNegotiation.tmpType = DWObject.CapType;
    ctnType.selectedIndex = 5;
    if (DynamsoftCapabilityNegotiation.tmpType > 2 && DynamsoftCapabilityNegotiation.tmpType < 7)
        ctnType.selectedIndex = DynamsoftCapabilityNegotiation.tmpType - 2;
    switch (DynamsoftCapabilityNegotiation.tmpType) {
        case EnumDWT_CapType.TWON_ARRAY /*3*/:
            alert('Setting an Array is not implemented');
            break;
        case EnumDWT_CapType.TWON_ENUMERATION /*4*/:
            if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.ICAP_FRAMES) {
                if (document.getElementById('availableValues').length == 1) { /*Nothing in the List*/
                    tempValue = txtReturnedOrToSet.value.split(' ');
                } else {
                    tempValue = document.getElementById('availableValues').value.split(' ');
                }
                if (txtReturnedOrToSet.value != DynamsoftCapabilityNegotiation.tempFrame) {
                    tempValue = txtReturnedOrToSet.value.split(' ');
                }
                DWObject.CapSetFrame(document.getElementById('availableValues').selectedIndex, parseFloat(tempValue[0]), parseFloat(tempValue[1]), parseFloat(tempValue[2]), parseFloat(tempValue[3]));
                DWObject.CapCurrentIndex = document.getElementById('availableValues').selectedIndex - 1;
                DWObject.CapSet();
                PrintCMDMessage(DWObject.ErrorString, true);
                for (i = 0; i < DWObject.CapNumItems; i++) {
                    DynamsoftCapabilityNegotiation.tempFrame = DWObject.CapGetFrameLeft(i) + " " + DWObject.CapGetFrameTop(i) + " " + DWObject.CapGetFrameRight(i) + " " + DWObject.CapGetFrameBottom(i);
                    PrintCMDMessage("Current Frame is: " + DynamsoftCapabilityNegotiation.tempFrame);
                }
            } else {
                DWObject.CapValue = document.getElementById('availableValues')[document.getElementById('availableValues').selectedIndex].value;
                DWObject.CapCurrentIndex = document.getElementById('availableValues').selectedIndex - 1;
                DWObject.CapSet();
                PrintCMDMessage(DWObject.ErrorString, true);
                DWObject.CapGet();
                PrintCMDMessage('After Setting:');
                if (DWObject.CapValueType > 8) {
                    PrintCMDMessage('Current Index = ' + DWObject.CapCurrentIndex + ' (Value: ' + DWObject.GetCapItemsString(DWObject.CapCurrentIndex) + ')', true);
                    PrintCMDMessage('Default Index = ' + DWObject.CapDefaultIndex + ' (Value: ' + DWObject.GetCapItemsString(DWObject.CapDefaultIndex) + ')', true);
                } else {
                    PrintCMDMessage('Current Index = ' + DWObject.CapCurrentIndex + ' (Value: ' + DWObject.GetCapItems(DWObject.CapCurrentIndex) + ')', true);
                    PrintCMDMessage('Default Index = ' + DWObject.CapDefaultIndex + ' (Value: ' + DWObject.GetCapItems(DWObject.CapDefaultIndex) + ')', true);
                }
            }
            break;
        case EnumDWT_CapType.TWON_ONEVALUE /*5*/:
            if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.ICAP_FRAMES) {
                tempValue = txtReturnedOrToSet.value.split(' ');
                DWObject.CapSetFrame(0, parseFloat(tempValue[0]), parseFloat(tempValue[1]), parseFloat(tempValue[2]), parseFloat(tempValue[3]));
                DWObject.CapSet();
                PrintCMDMessage(DWObject.ErrorString, true);
                for (i = 0; i < DWObject.CapNumItems; i++) {
                    DynamsoftCapabilityNegotiation.tempFrame = DWObject.CapGetFrameLeft(i) + " " + DWObject.CapGetFrameTop(i) + " " + DWObject.CapGetFrameRight(i) + " " + DWObject.CapGetFrameBottom(i);
                    PrintCMDMessage("Current Frame is: " + DynamsoftCapabilityNegotiation.tempFrame);
                }
            } else {
                if (DynamsoftCapabilityNegotiation.CurrentCapabilityHasBoolValue) {
                    DWObject.CapValue = TrueOrFalse.value;
                } else {
                    if (DWObject.CapValueType > 8)
                        /*STR*/
                        DWObject.CapValue = txtReturnedOrToSet.value;
                    else
                        /*NUM*/
                        DWObject.CapValue = parseFloat(txtReturnedOrToSet.value);
                }
                DWObject.CapSet();
                PrintCMDMessage(DWObject.ErrorString, true);
                DWObject.CapGet();
                valueToShow = DWObject.CapValue;
                if (DWObject.CapValueType == EnumDWT_CapValueType.TWTY_BOOL) {
                    if (valueToShow == 0) valueToShow = 'FALSE';
                    else valueToShow = 'TRUE';
                }
                PrintCMDMessage('Value after setting: ' + valueToShow, true);
            }
            break;
        case EnumDWT_CapType.TWON_RANGE /*6*/:
            DWObject.CapCurrentValue = parseFloat(txtReturnedOrToSet.value);
            DWObject.CapSet();
            PrintCMDMessage(DWObject.ErrorString, true);
            DWObject.CapGet();
            valueToShow = DWObject.CapCurrentValue;
            PrintCMDMessage('Value after setting: ' + valueToShow, true);
            break;
        default:
            console.log('This Capability is not supported');
    }
}

function clearInfo() {
    document.getElementById('status_text').innerHTML = "";
    textStatus = "";
}

function changeByMesageType() {
    switch (parseInt(document.getElementById('messageType').value)) {
        case EnumDWT_MessageType.TWQC_GET:
            document.getElementById('btnSetCapability').style.display = 'none';
            txtReturnedOrToSet.placeholder = 'Returned Value';
            txtReturnedOrToSet.style.display = '';
            TrueOrFalse.style.display = 'none';
            document.getElementById('textAboveInput').innerText = 'Returned:';
            document.getElementById('textAboveInput').style.display = '';
            break;
        case EnumDWT_MessageType.TWQC_SET:
            document.getElementById('btnSetCapability').style.display = '';
            txtReturnedOrToSet.placeholder = 'Value to Set';
            txtReturnedOrToSet.value = '';
            if (DynamsoftCapabilityNegotiation.tmpType == EnumDWT_CapType.TWON_ENUMERATION) {
                document.getElementById('textAboveInput').style.display = 'none';
                txtReturnedOrToSet.style.display = 'none';
            } else {
                document.getElementById('textAboveInput').style.display = '';
                if (DynamsoftCapabilityNegotiation.CurrentCapabilityHasBoolValue) {
                    txtReturnedOrToSet.style.display = 'none';
                    TrueOrFalse.style.display = '';
                } else {
                    txtReturnedOrToSet.style.display = '';
                    TrueOrFalse.style.display = 'none';
                }
            }

            if (parseInt(supportedCapabilities.value) == EnumDWT_Cap.ICAP_FRAMES) {
                document.getElementById('textAboveInput').style.display = '';
                txtReturnedOrToSet.style.display = '';
                txtReturnedOrToSet.value = DynamsoftCapabilityNegotiation.tempFrame;
            }
            document.getElementById('textAboveInput').innerText = 'Set this Value:';
            break;
        case EnumDWT_MessageType.TWQC_RESET:
            clearInfo();
            if (DWObject.DataSourceStatus != 1) {
                DWObject.SetOpenSourceTimeout(2000);
                DWObject.OpenSource();
            }
            DWObject.Capability = parseInt(supportedCapabilities.value);
            DWObject.CapReset();
            PrintCMDMessage('Resetting ' + supportedCapabilities.options[supportedCapabilities.options.selectedIndex].innerText + ' in 1 second...', true);
            setTimeout(function () {
                get_CAP();
            }, 1000);
            break;
    }
}

/*For More Friendly UI*/

STR_CapValueType = [
    'TWTY_INT8', 'TWTY_INT16', 'TWTY_INT32', 'TWTY_UINT8', 'TWTY_UINT16', 'TWTY_int', 'TWTY_BOOL',
    'TWTY_FIX32', 'TWTY_FRAME', 'TWTY_STR32', 'TWTY_STR64', 'TWTY_STR128', 'TWTY_STR255'
];

STR_PageSizes = [
    "Custom", "A4LETTER, A4", "B5LETTER, JISB5", "USLETTER", "USLEGAL", "A5", "B4, ISOB4", "B6, ISOB6", "Unknown Size",
    "USLEDGER", "USEXECUTIVE", "A3", "B3, ISOB3", "A6", "C4", "C5", "C6", "4A0", "2A0", "A0", "A1", "A2", "A7",
    "A8", "A9", "A10", "ISOB0", "ISOB1", "ISOB2", "ISOB5", "ISOB7", "ISOB8", "ISOB9", "ISOB10", "JISB0", "JISB1",
    "JISB2", "JISB3", "JISB4", "JISB6", "JISB7", "JISB8", "JISB9", "JISB10", "C0", "C1", "C2", "C3", "C7", "C8",
    "C9", "C10", "USEXECUTIVE", "BUSINESSCARD"
];

STR_DuplexValue = ['TWDX_NONE(0)', 'TWDX_1PASSDUPLEX(1)', 'TWDX_2PASSDUPLEX(2)'];

STR_UnitType = ['INCHES(0)', 'CENTIMETERS(1)', 'PICAS(2)', 'POINTS(3)', 'TWIPS(4)', 'PIXELS(5)', 'MILLIMETERS(6)'];

STR_PixelType = ['TWPT_BW(0)', 'TWPT_GRAY(1)', 'TWPT_RGB(2)', 'TWPT_PALLETE(3)', 'TWPT_CMY(4)',
    'TWPT_CMYK(5)', 'TWPT_YUV(6)', 'TWPT_YUVK(7)', 'TWPT_CIEXYZ(8)', 'TWPT_LAB(9)', 'TWPT_SRGB(10)',
    'TWPT_SCRGB(11)', 'Unknown(12)', 'Unknown(13)', 'Unknown(14)', 'Unknown(15)', 'TWPT_INFRARED(16)'
];

STR_UnitType = ['TWUN_INCHES(0)', 'TWUN_CENTIMETERS(1)', 'TWUN_PICAS(2)', 'TWUN_POINTS(3)',
    'TWUN_TWIPS(4)', 'TWUN_PIXELS(5)', 'TWUN_MILLIMETERS(6)'
];

STR_XFERMECH = ['TWSX_NATIVE(0)', 'TWSX_FILE(1)', 'TWSX_MEMORY(2)', 'Unknown(3)', 'TWSX_MEMFILE(4)'];

STR_IMAGEFILEFORMAT = ['TWFF_TIFF(0)', 'TWFF_PICT(1)', 'TWFF_BMP(2)', 'TWFF_XBM(3)', 'TWFF_JFIF(4)',
    'TWFF_FPX(5)', 'TWFF_TIFFMULTI(6)', 'TWFF_PNG(7)', 'TWFF_SPIFF(8)', 'TWFF_EXIF(9)', 'TWFF_PDF(10)',
    'TWFF_JP2(11)', 'removed(12)', 'TWFF_JPX(13)', 'TWFF_DEJAVU(14)', 'TWFF_PDFA(15)', 'TWFF_PDFA2(16)'
];

STR_ORIENTATION = ['TWOR_PORTRAIT', 'TWOR_ROT90', 'TWOR_ROT180', 'TWOR_LANDSCAPE', 'TWOR_AUTO',
    'TWOR_AUTOTEXT', 'TWOR_AUTOPICTURE'
];

STR_PIXELFLAVOR = ['TWPF_CHOCOLATE(0)', 'TWPF_VANILLA(1)'];

function _showMeaningfulInfo(_cap) {
    var oSTR = [],
        bHasSTR = true;
    switch (parseInt(_cap)) {
        case 0x1122:
            oSTR = STR_PageSizes;
            break;
        case 0x0101:
            oSTR = STR_PixelType;
            break;
        case 0x0102:
            oSTR = STR_UnitType;
            break;
        case 0x0103:
            oSTR = STR_XFERMECH;
            break;
        case 0x110C:
            oSTR = STR_IMAGEFILEFORMAT;
            break;
        case 0x1110:
            oSTR = STR_ORIENTATION;
            break;
        case 0x111F:
            oSTR = STR_PIXELFLAVOR;
            break;
        default:
            bHasSTR = false;
            break;
    }
    if (bHasSTR) {
        for (var i = 1; i < document.getElementById('availableValues').options.length; i++) {
            document.getElementById('availableValues').options[i].text =
                oSTR[parseInt(document.getElementById('availableValues').options[i].value)];
        }
    }
}

function logThemAll() {
    var cssRule1 = "color: rgb(249, 162, 34);" +
        "font-size: 30px;" +
        "font-weight: bold;" +
        "text-shadow: 1px 1px 3px rgb(249, 162, 34);" +
        "filter: dropshadow(color=rgb(249, 162, 34), offx=1, offy=1);",
        cssRule2 = "color: rgb(249, 200, 34);" +
            "font-size: 20px;" +
            "font-weight: bold;" +
            "text-shadow: 1px 1px 1px rgb(249, 162, 34);" +
            "filter: dropshadow(color=rgb(249, 162, 34), offx=1, offy=1);";

    console.log("%cStart Logging...", cssRule1);
    console.log("%cCurrent Scanner is " + DWObject.CurrentSourceName, cssRule2);
    for (var i = 1; i < supportedCapabilities.length; i++) {
        supportedCapabilities.selectedIndex = i;
        get_CAP(parseInt(supportedCapabilities.value));
    }
}