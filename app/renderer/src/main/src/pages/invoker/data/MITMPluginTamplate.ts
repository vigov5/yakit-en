export const MITMPluginTemplate = `# mitm plugin template

yakit_output(MITM_PARAMS)

#-----------------------MITM Hooks I/O-------------------------
/*
# How to use plugin parameters?

## For example, if you have set a parameter called url_keyword, you can use it via MITM_PARAMS!
urlKeyword = MITM_PARAMS["url_keyword"]

# How to output for Yakit to display to the user?

yakit_output(i: any) // Can be output to the "Console interface" only
yakit_save(i: any)   // Can be output and saved to the database, viewable in "Plugin Output"
*/
#----------------MITM Hooks Test And Quick Debug-----------------
/*
# __test__ is a function used by Yakit mitm plugins for debugging. Note: This function will not be imported in the MITM hooks hijacking environment.

In this function, you can use yakit.GenerateYakitMITMHooksParams(method: string, url: string, opts ...http.Option) to conveniently generate parameters for hooks to call. Refer to the code template for usage examples.
*/


#--------------------------WORKSPACE-----------------------------
__test__ = func() {
    results, err := yakit.GenerateYakitMITMHooksParams("GET", "https://example.com")
    if err != nil {
        return
    }
    isHttps, url, reqRaw, rspRaw, body = results

    mirrorHTTPFlow(results...)
    mirrorFilteredHTTPFlow(results...)
    mirrorNewWebsite(results...)
    mirrorNewWebsitePath(results...)
    mirrorNewWebsitePathParams(results...)
}


# mirrorHTTPFlow will mirror all traffic here, including requests like .js / .css / .jpg that are usually filtered by the hijacking program
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow intercepts traffic that MITM automatically filters out, which may be related to "business," and automatically filters out traffic like js / css
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite is called for the first request of each new website that appears!
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath is called for the first request about a new website path, and the first HTTPFlow about this website path will be passed into this callback
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams is called for a new website path that comes with some parameters, and the first HTTPFlow after deduplication by common positions and parameter names is passed into this callback
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest will hijack each new HTTPRequest, and after hijacking, use forward(modified) to override the modified request. If you need to block the packet, use drop() to block it.
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked): Confirm forwarding
#       2. drop(): Drop the packet
#       3. If neither forward nor drop is called, the default data flow is used
#       4. If both drop and forward are called within one hijacking, drop takes precedence
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        modified = str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create")
        forward(poc.FixHTTPResponse(modified))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}


# hijackHTTPResponse will hijack each new HTTPResponse, and after hijacking, use forward(modified) to override the modified response. If you need to block the packet, use drop() to block it.
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked): Confirm forwarding
#       2. drop(): Drop the packet
#       3. If neither forward nor drop is called, the default data flow is used
#       4. If both drop and forward are called within one hijacking, drop takes precedence
/*
# Demo2 Best In Practice
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
        modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
        forward(modified)
    }
}
*/
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

# hijackSaveHTTPFlow is a Hook function for MITM storage procedures open to Yakit
# This function allows users to filter or modify before HTTP packets are stored in the database, add fields, coloring, etc.
# Similar to hijackHTTPRequest
#    1. hijackSaveHTTPFlow also uses the callback processing scheme of JS Promise. Users can modify within this method, and save by using modify(flow) after modification.
#    2. If the user does not want to save the packet, use drop().
# 
/**
Examples:

hijackSaveHTTPFlow = func(flow, modify, drop) {
    if str.Contains(flow.Url, "/admin/") {
        flow.Red()   # Set color
        modify(flow) # Save
    }
}
*/

hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // responseBytes, _ = codec.StrconvUnquote(flow.Response)
    // if str.MatchAnyOfRegexp(responseBytes, "/admin/", "accessKey") { flow.Red(); modify(flow) }
}

/* Quick reference

*yakit.HTTPFlow definition:
type palm/common/yakgrpc/yakit.(HTTPFlow) struct {
  Fields (Available Fields):
      Model: gorm.Model
      Hash: string
      IsHTTPS: bool
      Url: string
      Path: string
      Method: string
      BodyLength: int64
      ContentType: string
      StatusCode: int64
      SourceType: string
      Request: string                   # Needs to be decoded using codec.StrconvUnquote
      Response: string                  # Needs to be decoded using codec.StrconvUnquote
      GetParamsTotal: int
      PostParamsTotal: int
      CookieParamsTotal: int
      IPAddress: string
      RemoteAddr: string
      IPInteger: int
      Tags: string
  StructMethods (Structure Methods):
  PtrStructMethods (Pointer Structure Methods):
      func AddTag(v1: string)
      func BeforeSave() return(error)
      func Blue()                                           # Blue
      func CalcHash() return(string)                         
      func ColorSharp(v1: string)
      func Cyan()                                           # Cyan
      func Green()                                          # Green
      func Grey()                                           # Grey
      func Orange()                                         # Orange
      func Purple()                                         # Purple
      func Red()                                            # Red
      func RemoteColor()
      func ToGRPCModel() return(*ypb.HTTPFlow, error)
      func ToGRPCModelFull() return(*ypb.HTTPFlow, error)
      func Yellow()                                         # Yellow
}
*/
`

export const MITMPluginTemplateShort = `# mirrorHTTPFlow mirrors all traffic to here, including requests like .js / .css / .jpg that are generally filtered by hijacking programs
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow intercepts traffic that MITM automatically filters out, which may be related to "business," and automatically filters out traffic like js / css
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite is called for the first request of each new website that appears!
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath is called for the first request about a new website path, and the first HTTPFlow about this website path will be passed into this callback
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams is called for a new website path that comes with some parameters, and the first HTTPFlow after deduplication by common positions and parameter names is passed into this callback
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest will hijack each new HTTPRequest, and after hijacking, use forward(modified) to override the modified request. If you need to block the packet, use drop() to block it.
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked): Confirm forwarding
#       2. drop(): Drop the packet
#       3. If neither forward nor drop is called, the default data flow is used
#       4. If both drop and forward are called within one hijacking, drop takes precedence
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        modified = str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create")
        forward(poc.FixHTTPResponse(modified))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}


# hijackHTTPResponse will hijack each new HTTPResponse, and after hijacking, use forward(modified) to override the modified response. If you need to block the packet, use drop() to block it.
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. forward(hijacked): Confirm forwarding
#       2. drop(): Drop the packet
#       3. If neither forward nor drop is called, the default data flow is used
#       4. If both drop and forward are called within one hijacking, drop takes precedence
/*
# Demo2 Best In Practice
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
        modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
        forward(modified)
    }
}
*/
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    // if str.Contains(string(rsp), "凝聚磅礴的中国文学力量") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "凝聚磅礴的中国文学力量", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

# hijackSaveHTTPFlow is a Hook function for MITM storage procedures open to Yakit
# This function allows users to filter or modify before HTTP packets are stored in the database, add fields, coloring, etc.
# Similar to hijackHTTPRequest
#    1. hijackSaveHTTPFlow also uses the callback processing scheme of JS Promise. Users can modify within this method, and save by using modify(flow) after modification.
#    2. If the user does not want to save the packet, use drop().
# 
/**
Examples:

hijackSaveHTTPFlow = func(flow, modify, drop) {
    if str.Contains(flow.Url, "/admin/") {
        flow.Red()   # Set color
        modify(flow) # Save
    }
}
*/

hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // responseBytes, _ = codec.StrconvUnquote(flow.Response)
    // if str.MatchAnyOfRegexp(responseBytes, "/admin/", "accessKey") { flow.Red(); modify(flow) }
}

/* Quick reference

*yakit.HTTPFlow definition:
type palm/common/yakgrpc/yakit.(HTTPFlow) struct {
  Fields (Available Fields):
      Model: gorm.Model
      Hash: string
      IsHTTPS: bool
      Url: string
      Path: string
      Method: string
      BodyLength: int64
      ContentType: string
      StatusCode: int64
      SourceType: string
      Request: string                   # Needs to be decoded using codec.StrconvUnquote
      Response: string                  # Needs to be decoded using codec.StrconvUnquote
      GetParamsTotal: int
      PostParamsTotal: int
      CookieParamsTotal: int
      IPAddress: string
      RemoteAddr: string
      IPInteger: int
      Tags: string
  StructMethods (Structure Methods):
  PtrStructMethods (Pointer Structure Methods):
      func AddTag(v1: string)
      func BeforeSave() return(error)
      func Blue()                                           # Blue
      func CalcHash() return(string)                         
      func ColorSharp(v1: string)
      func Cyan()                                           # Cyan
      func Green()                                          # Green
      func Grey()                                           # Grey
      func Orange()                                         # Orange
      func Purple()                                         # Purple
      func Red()                                            # Red
      func RemoteColor()
      func ToGRPCModel() return(*ypb.HTTPFlow, error)
      func ToGRPCModelFull() return(*ypb.HTTPFlow, error)
      func Yellow()                                         # Yellow
}
*/
`
