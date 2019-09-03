<%@ Page Language="C#" %>

<%
    try
    {
        String timeStamp = HttpContext.Current.Request["timestamp"];
        String strInfo = HttpContext.Current.Request["infoToSave"];
        String infoFolder = Server.MapPath(".") + "\\collected";
        if (!System.IO.Directory.Exists(infoFolder))
            System.IO.Directory.CreateDirectory(infoFolder);
        String newFilePath = infoFolder + "\\" + timeStamp + ".txt";
        System.IO.File.WriteAllText(newFilePath,strInfo);
    }
    catch(Exception e)
    {
        Response.Write(e.Message);
    }
%>