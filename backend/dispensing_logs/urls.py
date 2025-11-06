from django.urls import path
from . import views

app_name = 'dispensing_logs'

urlpatterns = [
    path('', views.DispensingLogList.as_view(), name='list'),
]