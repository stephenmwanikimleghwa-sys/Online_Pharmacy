from rest_framework.response import Response
from rest_framework import status

def api_response(data=None, message=None, success=True, status_code=status.HTTP_200_OK, error=None):
    """
    Standardized API response format.
    
    Structure:
    {
        "success": boolean,
        "message": string (optional),
        "data": any (optional),
        "error": string (optional)
    }
    """
    response_data = {
        "success": success
    }
    
    if message:
        response_data["message"] = message
        
    if data is not None:
        response_data["data"] = data
        
    if error:
        response_data["error"] = error
        
    return Response(response_data, status=status_code)
